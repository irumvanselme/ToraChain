"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@tora-chain/fe-common";
import { TopNav } from "../components/top-nav";

/**
 * Auth boundary for vote verification. The backend verify endpoint is gated to
 * the vote's owner, so the voter must be signed in for the cross-check to run.
 */
export default function VerifyLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <TopNav />
      <main className="flex-1 flex flex-col">{children}</main>
    </RequireAuth>
  );
}
