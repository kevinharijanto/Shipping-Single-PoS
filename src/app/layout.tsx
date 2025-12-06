import "./globals.css";
import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Shipping PoS System",
  description: "Single user Point of Sale system for shipping business."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white transition-colors">
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen flex">
              {/* Left sidebar navigation */}
              <Navigation />

              {/* Content area */}
              <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 md:pt-8 pt-16">
                {children}
              </main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
