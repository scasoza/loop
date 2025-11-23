import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Loop",
  description: "Starter app with Prisma and Vercel ready configuration"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
