import type { ReactNode } from "react";

import { LandingHeader } from "../components/landing-header";
import { SiteFooter } from "../components/site-footer";

/**
 * Public chrome for the legal pages (terms, privacy). Lives outside the
 * `/elections` auth boundary so these pages stay open to everyone.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <LandingHeader />
      <main className="flex-1">
        <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:py-16">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
