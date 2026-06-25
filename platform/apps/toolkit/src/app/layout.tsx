import type { Metadata } from "next";
import { Archivo_Black } from "next/font/google";
import "./globals.css";

// Bold, graphic display face for headings + wordmark — matches the public landing.
const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Design Toolkit",
  description: "AI tools for the architecture design studio."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
