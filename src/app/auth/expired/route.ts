import { NextResponse } from "next/server";
import { authCookieName, authCookieOptions, getSessionFromCookies } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { loadActiveUser } from "@/lib/current-user";
export const dynamic = "force-dynamic";
export const GET = withErrorHandling("auth:expired", async (request: Request) => {
    const user = await loadActiveUser(await getSessionFromCookies());
    if (user) {
        return NextResponse.redirect(new URL("/", request.url));
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(authCookieName, "", { ...authCookieOptions, maxAge: 0 });
    return response;
});
