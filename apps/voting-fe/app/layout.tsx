import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";

import { DevLinks } from "@tora-chain/ui-components/dev-links";
import { DevBanner } from "@tora-chain/ui-components/dev-banner";

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
        {/* Dev-only corner ribbon warning users not to submit sensitive data. */}
        <DevBanner />
      </body>
    </html>
  );
}
