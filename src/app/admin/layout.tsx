import { Suspense } from "react";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import AdminLayoutClient from "./AdminLayoutClient";

export const metadata: Metadata = {
  manifest: "/manifest-admin.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "超級運動後台",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <AdminLayoutClient>
        <Suspense>{children}</Suspense>
      </AdminLayoutClient>
    </NuqsAdapter>
  );
}
