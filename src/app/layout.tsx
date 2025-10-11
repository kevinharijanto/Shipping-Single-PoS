import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kurasi — Single API Quote",
  description: "Fresh Next.js 15 app with a single calculator proxy route."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900">{children}</body>
    </html>
  );
}
