import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin", "vietnamese"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "The Memoba",
  description: "Turn previous experience into evidence for the next decision.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={`${geist.variable} font-sans`}><body className="min-h-screen antialiased">{children}</body></html>;
}
