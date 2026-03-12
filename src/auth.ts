import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Admin Login",
      credentials: {
        username: { label: "帳號", type: "text" },
        password: { label: "密碼", type: "password" },
      },
      async authorize(credentials) {
        const username = process.env.ADMIN_USERNAME || "admin";
        const password = process.env.ADMIN_PASSWORD || "sportnews2024";

        if (
          credentials?.username === username &&
          credentials?.password === password
        ) {
          return { id: "1", name: "Admin", email: "admin@sportnews.local" };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isAdmin = request.nextUrl.pathname.startsWith("/admin");
      const isApi = request.nextUrl.pathname.startsWith("/api");
      const isCron = request.nextUrl.pathname.startsWith("/api/cron");
      const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth");

      // cron 和 auth API 不需要登入
      if (isCron || isAuthApi) return true;

      // admin 頁面需要登入
      if (isAdmin && !auth) return false;

      // 其他 API 需要登入（除了 GET 公開的）
      if (isApi && !isCron && !isAuthApi && !auth) {
        return false;
      }

      return true;
    },
  },
});
