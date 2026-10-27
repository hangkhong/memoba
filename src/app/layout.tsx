import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";


export const metadata: Metadata = {
  title: "The Memory Bank",
  description: "Turn previous experience into evidence for the next decision.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className="font-sans"><body className="min-h-screen antialiased">{children}</body></html>;
}
