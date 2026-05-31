import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "lilbuddy — Session Dashboard",
  description: "Real-time Claude Code session monitoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
