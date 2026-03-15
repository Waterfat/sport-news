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

  // admin 頁面需要 admin 角色
  if (pathname.startsWith("/admin")) {
    if (!req.auth) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // 檢查 admin 角色（OAuth 會員不能進後台）
    const role = (req.auth as { user?: { role?: string } })?.user?.role;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // member API 需要已登入
  if (pathname.startsWith("/api/member") && !req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 其他 API（settings 等）需要 admin 登入
  if (pathname.startsWith("/api/settings") && !req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
