import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_API_ROUTES = ["/api/cron", "/api/auth", "/api/public"];
const CANONICAL_HOST = "howger-sport.com";
const ADMIN_HOST = "admin.howger-sport.com";

// Admin subdomain 允許的路徑前綴
const ADMIN_ALLOWED_PREFIXES = [
  "/admin",
  "/login",
  "/api/auth",
  "/api/admin",
  "/api/dashboard",
  "/api/settings",
  "/api/rewrite",
  "/api/publish",
  "/api/articles",
  "/api/personas",
  "/api/cron",
  "/api/public",
];

export default auth((req) => {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  // Vercel preview → redirect to canonical (排除 admin subdomain)
  if (
    host !== CANONICAL_HOST &&
    host !== ADMIN_HOST &&
    host.includes("vercel.app")
  ) {
    const url = new URL(req.url);
    url.host = CANONICAL_HOST;
    url.protocol = "https";
    return NextResponse.redirect(url, 301);
  }

  // === Admin subdomain ===
  if (host === ADMIN_HOST) {
    // 靜態資源直接放行
    if (
      pathname.match(
        /\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?|ttf|eot|webp|avif)$/
      )
    ) {
      return NextResponse.next();
    }

    // 前台頁面路徑 → redirect 到主域名
    const isAllowed = ADMIN_ALLOWED_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );
    if (!isAllowed && pathname !== "/") {
      const url = new URL(req.url);
      url.host = CANONICAL_HOST;
      url.protocol = "https";
      return NextResponse.redirect(url);
    }

    // Root → redirect 到主域名首頁
    if (pathname === "/") {
      return NextResponse.redirect(`https://${CANONICAL_HOST}/`);
    }

    // /admin 路徑需要 admin 角色
    if (pathname.startsWith("/admin")) {
      if (!req.auth) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      const role = (req.auth as { user?: { role?: string } })?.user?.role;
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      return NextResponse.next();
    }

    // 公開 API 不需登入
    if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // 其餘 API 需要登入
    if (pathname.startsWith("/api") && !req.auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  // === 主域名 ===

  // 主域名 /admin → redirect 到 admin subdomain
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(`https://${ADMIN_HOST}${pathname}`);
  }

  // 公開 API、cron API 和 auth API 不需要登入
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // member API 需要已登入
  if (pathname.startsWith("/api/member") && !req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 其他 API 需要登入
  if (pathname.startsWith("/api") && !req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
