import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600"], variable: "--font-plex" });


export const metadata: Metadata = {
  title: "The Memoba",
  description: "Turn previous experience into evidence for the next decision.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={`${plex.variable} font-sans`}><body className="min-h-screen antialiased">{children}</body></html>;
}
