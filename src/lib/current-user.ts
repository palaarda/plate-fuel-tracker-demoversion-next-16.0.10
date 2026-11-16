import { cache } from "react";
import { getSessionFromCookies, type SessionPayload, type VerifiedSession } from "./auth";
import { connectDb } from "./db";
import { isUserRole } from "./roles";
import { isObjectIdString } from "./validation";
import { UserModel } from "../models/User";
export const isIssuedBeforePasswordChange = (iatSeconds: number, passwordChangedAt: unknown): boolean => {
    if (passwordChangedAt === undefined || passwordChangedAt === null)
        return false;
    const changedAtMs = passwordChangedAt instanceof Date ? passwordChangedAt.getTime() : NaN;
    if (!Number.isFinite(changedAtMs))
        return true;
    return iatSeconds * 1000 < changedAtMs;
};
export const loadActiveUser = async (token: VerifiedSession | null): Promise<SessionPayload | null> => {
    if (!token || !isObjectIdString(token.sub))
        return null;
    await connectDb();
    const user = await UserModel.findById(token.sub)
        .select("username name role passwordChangedAt")
        .lean();
    if (!user)
        return null;
    if (isIssuedBeforePasswordChange(token.iat, user.passwordChangedAt))
        return null;
    return {
        sub: token.sub,
        username: user.username,
        name: user.name,
        role: isUserRole(user.role) ? user.role : "user",
    };
};
export const getCurrentUser = cache(async () => loadActiveUser(await getSessionFromCookies()));
