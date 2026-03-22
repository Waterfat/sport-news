import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_TC } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifTC = Noto_Serif_TC({
  variable: "--font-noto-serif-tc",
  weight: ["600", "700", "900"],
  preload: false,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e3a5f" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://howger-sport.com"),
  title: {
    default: "好球研究所 - 體育賽事分析",
    template: "%s | 好球研究所",
  },
  description: "體育賽事深度分析、NBA、MLB 投注推薦與專業報導",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "好球研究所",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: "好球研究所 Howger Lab",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifTC.variable} antialiased`}
      >
        <NuqsAdapter>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <QueryProvider>
              <SessionProvider>{children}</SessionProvider>
              <Toaster richColors />
            </QueryProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
      <GoogleAnalytics gaId="G-09TF9265JG" />
    </html>
  );
}
