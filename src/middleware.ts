import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_API_ROUTES = ["/api/cron", "/api/auth", "/api/public"];
const CANONICAL_HOST = "howger-sport.com";

export default auth((req) => {
  const host = req.headers.get("host") || "";
  if (host !== CANONICAL_HOST && host.includes("vercel.app")) {
    const url = new URL(req.url);
    url.host = CANONICAL_HOST;
    url.protocol = "https";
    return NextResponse.redirect(url, 301);
  }

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
