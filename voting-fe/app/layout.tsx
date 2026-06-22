import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";
// Subpath import (not the barrel): the barrel re-exports client-only
// components without a "use client" directive, which a Server Component layout
// can't evaluate. This file carries its own directive.
import { DevLinks } from "@tora-chain/ui-components/DevLinks";
import "./globals.css";
import { Providers } from "./providers";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tora-Chain | Voting",
  description: "Tora-Chain voting website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${googleSans.className} ${googleSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        {/* Dev-only floating links to the other ToraChain services. */}
        <DevLinks />
      </body>
    </html>
  );
}
