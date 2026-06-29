import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DevLinks, DevBanner } from "@tora-chain/ui-components/react";

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
        {/* Dev-only corner ribbon warning users not to submit sensitive data. */}
        <DevBanner />
      </body>
    </html>
  );
}
