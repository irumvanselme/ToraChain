"use client";

import Link from "next/link";
import { LogoSquare, Button } from "@tora-chain/ui-components";
import { useVoterEntry } from "./use-voter-entry";

/**
 * Public header for the landing page. Shows the brand and a single action that
 * adapts to session state: "Sign in" for visitors, "Elections" once signed in.
 */
export function LandingHeader() {
  const { user, loading, enter } = useVoterEntry();

  return (
    <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100/90 backdrop-blur">
      <nav className="navbar container mx-auto px-1 min-h-14">
        <div className="navbar-start">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <LogoSquare />
            <span className="text-sm font-semibold">Tora-Chain</span>
            <span className="divider divider-horizontal mx-0" />
            <span className="text-sm font-medium text-base-content/60 hidden sm:inline">
              Voting
            </span>
          </Link>
        </div>

        <div className="navbar-end">
          <Button size="sm" onClick={enter} loading={loading}>
            {user ? "Elections" : "Sign in"}
          </Button>
        </div>
      </nav>
    </header>
  );
}
