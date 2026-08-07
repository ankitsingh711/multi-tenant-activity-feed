import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Account Activity Feed",
  description: "Secure multi-tenant account activity feed demo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
