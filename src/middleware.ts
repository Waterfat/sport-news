import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_API_ROUTES = ["/api/cron", "/api/auth", "/api/public"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 公開 API、cron API 和 auth API 不需要登入
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // admin 頁面需要登入
  if (pathname.startsWith("/admin") && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // API 需要登入
  if (pathname.startsWith("/api") && !req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
