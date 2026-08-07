import type { Metadata } from "next";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import AppProviders from "@/components/AppProviders";

export const metadata: Metadata = {
  title: "RCC Excel Automation",
  description: "Configurable Excel transformation tool with a rule editor and Excel-style preview grid.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Ensures MUI's emotion styles are collected and injected during SSR
            instead of only on the client - the root-cause fix for MUI+Next.js
            App Router hydration mismatches/style-flash, not a workaround. */}
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <AppProviders>{children}</AppProviders>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
