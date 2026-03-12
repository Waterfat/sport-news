import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 公開 API、cron API 和 auth API 不需要登入
  if (
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public")
  ) {
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
