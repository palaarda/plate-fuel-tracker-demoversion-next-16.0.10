import { NextResponse } from "next/server";
import { getSessionFromCookies, type SessionPayload } from "./auth";
import { loadActiveUser } from "./current-user";
import { ConfigError, isProduction } from "./env";
import { isAdminRole } from "./roles";
import { isObjectIdString } from "./validation";
import { VehicleModel } from "../models/Vehicle";
const MAX_JSON_BODY_BYTES = 16 * 1024;
const MAX_ROUTE_KEY_LENGTH = 64;
export type IdRouteContext = {
    params: Promise<{
        id: string;
    }>;
};
export const jsonError = (message: string, status: number, headers?: HeadersInit) => NextResponse.json({ message }, { status, headers });
type AuthResult = {
    ok: true;
    session: SessionPayload;
} | {
    ok: false;
    response: NextResponse;
};
export const requireAuth = async ({ admin = false } = {}): Promise<AuthResult> => {
    const token = await getSessionFromCookies();
    if (!token || !isObjectIdString(token.sub)) {
        return { ok: false, response: jsonError("Oturum açmanız gerekiyor.", 401) };
    }
    const user = await loadActiveUser(token);
    if (!user) {
        return { ok: false, response: jsonError("Oturum geçersiz.", 401) };
    }
    if (admin && !isAdminRole(user.role)) {
        return { ok: false, response: jsonError("Bu işlem için yetkiniz yok.", 403) };
    }
    return { ok: true, session: user };
};
export const readJsonBody = async (request: Request): Promise<unknown> => {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_JSON_BODY_BYTES)
        return undefined;
    try {
        const text = await request.text();
        if (text.length > MAX_JSON_BODY_BYTES)
            return undefined;
        return JSON.parse(text);
    }
    catch {
        return undefined;
    }
};
export const getRouteKey = async (ctx: IdRouteContext): Promise<string | null> => {
    const { id } = await ctx.params;
    const key = typeof id === "string" ? id.trim() : "";
    return key && key.length <= MAX_ROUTE_KEY_LENGTH ? key : null;
};
export const findVehicleByKey = async (key: string) => {
    if (isObjectIdString(key)) {
        const byId = await VehicleModel.findById(key).lean();
        if (byId)
            return byId;
    }
    return VehicleModel.findOne({ plate: key.toUpperCase() }).lean();
};
export const isDuplicateKeyError = (error: unknown) => typeof error === "object" && error !== null && (error as {
    code?: unknown;
}).code === 11000;
export const handleRouteError = (error: unknown, context: string) => {
    if (error instanceof ConfigError) {
        console.error(`[${context}] Yapılandırma hatası: ${error.message}`);
    }
    else if (isProduction) {
        const summary = error instanceof Error ? `${error.name}: ${error.message}` : "Bilinmeyen hata";
        console.error(`[${context}] ${summary}`);
    }
    else {
        console.error(`[${context}]`, error);
    }
    return jsonError("Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.", 500);
};
export const withErrorHandling = <A extends unknown[]>(context: string, handler: (...args: A) => Promise<Response>) => async (...args: A): Promise<Response> => {
    try {
        return await handler(...args);
    }
    catch (error) {
        return handleRouteError(error, context);
    }
};
