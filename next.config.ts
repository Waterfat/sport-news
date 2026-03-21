import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a.espncdn.com",
      },
      {
        protocol: "https",
        hostname: "*.espncdn.com",
      },
      {
        protocol: "https",
        hostname: "fmakjkvkmbltqgyndijb.supabase.co",
      },
    ],
  },
};

export default nextConfig;
