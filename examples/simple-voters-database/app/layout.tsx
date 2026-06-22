import type { Metadata } from "next";
import { LogoSquare } from "@tora-chain/ui-components/LogoSquare";
import { TriangleAlert } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simple Voters Database — Dev Only",
  description:
    "Development reference implementation of the ToraChain eligibility API.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-base-200">
        {/* ⚠️ Persistent dev-only banner */}
        <div className="bg-warning text-warning-content px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold">
          <TriangleAlert className="size-4 shrink-0" />
          FOR TESTING / DEVELOPMENT ONLY — do not use real personal data and do
          not deploy to production.
          <TriangleAlert className="size-4 shrink-0" />
        </div>

        {/* Navbar */}
        <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100">
          <nav className="navbar max-w-5xl mx-auto px-4 min-h-14">
            <div className="navbar-start flex items-center gap-3">
              <LogoSquare />
              <div className="divider divider-horizontal mx-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">
                  Simple Voters Database
                </span>
                <span className="text-xs text-base-content/50">
                  Eligibility API reference
                </span>
              </div>
            </div>
            <div className="navbar-end">
              <span className="badge badge-warning badge-sm font-semibold">
                dev only
              </span>
            </div>
          </nav>
        </header>

        {/* Page content */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-base-300 bg-base-100 py-4 px-4 text-center text-xs text-base-content/40">
          ToraChain · Simple Voters Database · development reference only
        </footer>
      </body>
    </html>
  );
}
