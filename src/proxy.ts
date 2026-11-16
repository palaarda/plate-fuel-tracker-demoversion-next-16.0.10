import { NextResponse, type NextRequest } from "next/server";
import { authCookieName, authCookieOptions, verifySessionToken } from "@/lib/auth";
const publicPaths = new Set([
    "/login",
    "/auth/expired",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/session",
]);
const unauthorized = (request: NextRequest, message: string) => {
    const { pathname } = request.nextUrl;
    if (pathname.startsWith("/api")) {
        return NextResponse.json({ message }, { status: 401 });
    }
    if (pathname === "/") {
        return NextResponse.rewrite(new URL("/login", request.url));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
};
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (pathname.startsWith("/assets")) {
        return NextResponse.next();
    }
    const isPublic = publicPaths.has(pathname);
    const token = request.cookies.get(authCookieName)?.value;
    if (!token) {
        return isPublic ? NextResponse.next() : unauthorized(request, "Oturum açmanız gerekiyor.");
    }
    let session;
    try {
        session = verifySessionToken(token);
    }
    catch (err) {
        console.error("[proxy] Oturum doğrulanamadı:", err instanceof Error ? err.message : err);
        return NextResponse.json({ message: "Sunucu hatası oluştu." }, { status: 500 });
    }
    if (!session) {
        const response = isPublic
            ? NextResponse.next()
            : unauthorized(request, "Oturum geçersiz veya süresi dolmuş.");
        response.cookies.set(authCookieName, "", { ...authCookieOptions, maxAge: 0 });
        return response;
    }
    if (pathname === "/login") {
        return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
}
export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
