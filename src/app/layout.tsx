import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "vietnamese"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "The Memoba",
  description: "Turn previous experience into evidence for the next decision.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={`${manrope.variable} font-sans`}><body className="min-h-screen antialiased">{children}</body></html>;
}
