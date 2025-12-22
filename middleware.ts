import { NextResponse, type NextRequest } from "next/server";
import { authCookieName, authCookieOptions, verifySessionToken } from "@/lib/auth";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/session"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = publicPaths.some((path) => pathname.startsWith(path));
  const token = request.cookies.get(authCookieName)?.value;

  // Statik dosyalar veya favicon için hiçbir kontrol yapma
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  if (!token) {
    if (isPublic) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Yetkisiz" }, { status: 401 });
    }

    // Ana domainde (/), login sayfasını rewrite ederek URL'yi aynı tut
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/login", request.url));
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = verifySessionToken(token);
  if (!session) {
    const response = pathname.startsWith("/api")
      ? NextResponse.json({ message: "Oturum geçersiz" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));

    response.cookies.set(authCookieName, "", { ...authCookieOptions, maxAge: 0 });
    return response;
  }

  // Login sayfasında oturum varsa dashboard'a yönlendir
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

