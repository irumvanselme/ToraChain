"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@tora-chain/fe-common";
import { TopNav } from "../components/top-nav";

/**
 * Auth boundary for the voting area. Everything under `/elections` requires a
 * session; unauthenticated visitors are redirected to the voter sign-in page.
 * The public landing page at `/` lives outside this layout and stays open.
 */
export default function ElectionsLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <TopNav />
      <main className="flex-1 flex flex-col">{children}</main>
    </RequireAuth>
  );
}
