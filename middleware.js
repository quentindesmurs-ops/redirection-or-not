import { NextResponse } from "next/server";

export function middleware(request) {
  const authCookie = request.cookies.get("seo-tool-auth");

  if (authCookie?.value === "ok") {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/api/login") {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
