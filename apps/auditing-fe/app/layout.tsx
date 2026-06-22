import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// Subpath import (not the barrel): the barrel re-exports client-only
// components without a "use client" directive, which a Server Component layout
// can't evaluate. This file carries its own directive.
import { DevLinks } from "@tora-chain/ui-components/DevLinks";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tora-Chain | Auditing",
  description: "Tora-Chain Auditing website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        {/* Dev-only floating links to the other ToraChain services. */}
        <DevLinks />
      </body>
    </html>
  );
}
