import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { findOrCreateMember } from "@/lib/member";

// 擴展 NextAuth 型別
declare module "next-auth" {
  interface User {
    role?: "admin" | "member";
    memberId?: string;
  }
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "admin" | "member";
      memberId?: string;
    };
  }
}

declare module "next-auth" {
  interface JWT {
    role?: "admin" | "member";
    memberId?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // 前台會員 - Google
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    // 前台會員 - LINE（自訂 OAuth provider）
    {
      id: "line",
      name: "LINE",
      type: "oauth",
      clientId: process.env.LINE_CHANNEL_ID!,
      clientSecret: process.env.LINE_CHANNEL_SECRET!,
      checks: ["state"],
      authorization: {
        url: "https://access.line.me/oauth2/v2.1/authorize",
        params: { scope: "profile openid email", response_type: "code" },
      },
      token: "https://api.line.me/oauth2/v2.1/token",
      userinfo: "https://api.line.me/v2/profile",
      profile(profile: { userId: string; displayName: string; pictureUrl?: string }) {
        return {
          id: profile.userId,
          name: profile.displayName,
          image: profile.pictureUrl,
        };
      },
    },
    // 後台 Admin - 保留現有
    Credentials({
      name: "Admin Login",
      credentials: {
        username: { label: "帳號", type: "text" },
        password: { label: "密碼", type: "password" },
      },
      async authorize(credentials) {
        const username = process.env.ADMIN_USERNAME;
        const password = process.env.ADMIN_PASSWORD;

        if (!username || !password) {
          console.error(
            "[Auth] ADMIN_USERNAME or ADMIN_PASSWORD not set. Login will fail."
          );
          return null;
        }

        if (
          credentials?.username === username &&
          credentials?.password === password
        ) {
          return {
            id: "1",
            name: "Admin",
            email: "admin@howger-sport.com",
            role: "admin",
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Credentials 登入（admin）
      if (account?.provider === "credentials") {
        token.role = "admin";
        return token;
      }

      // OAuth 首次登入：寫入 DB
      if (account && (account.provider === "google" || account.provider === "line")) {
        try {
          const member = await findOrCreateMember({
            email: user?.email ?? null,
            name: user?.name ?? null,
            avatar_url: user?.image ?? null,
            provider: account.provider as "google" | "line",
            provider_account_id: account.providerAccountId,
            access_token: account.access_token ?? null,
            refresh_token: account.refresh_token ?? null,
            expires_at: account.expires_at ?? null,
          });
          token.role = "member";
          token.memberId = member.id;
          token.picture = user?.image ?? token.picture;
        } catch (err) {
          console.error("[Auth] Failed to create/find member:", err);
          token.role = "member";
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as "admin" | "member";
        session.user.memberId = token.memberId as string | undefined;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // cron 和 auth API 不需要登入
      if (
        pathname.startsWith("/api/cron") ||
        pathname.startsWith("/api/auth")
      ) {
        return true;
      }

      // 公開 API 不需要登入
      if (pathname.startsWith("/api/public")) {
        return true;
      }

      // admin 頁面：auth 檢查全部由 middleware 處理（含 subdomain redirect）
      if (pathname.startsWith("/admin")) {
        return true;
      }

      // member API 需要已登入（任何角色）
      if (pathname.startsWith("/api/member")) {
        return !!auth;
      }

      // 其他 API（settings 等）需要登入
      if (pathname.startsWith("/api")) {
        return !!auth;
      }

      // 前台頁面全部公開
      return true;
    },
  },
});
