import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Excel Automation V1.01",
  description: "Convert raw PPID/TS# excel data into a flat, pivot-ready table.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
