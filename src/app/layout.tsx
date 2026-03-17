import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/auth/SessionProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://howger-sport.com"),
  title: {
    default: "小豪哥體育資訊網 - 體育新聞",
    template: "%s | 小豪哥體育資訊網",
  },
  description: "最新體育新聞、NBA、MLB、足球賽事報導與深度分析",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "小豪哥體育",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-180x180.png",
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: "小豪哥體育資訊網",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="bg-white">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
