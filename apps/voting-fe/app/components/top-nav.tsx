"use client";

import Link from "next/link";
import { useAuth, signOut } from "@tora-chain/fe-common";
import { AccountMenu, AppHeader, LogoSquare } from "@tora-chain/ui-components";
import { ShieldCheck, User } from "lucide-react";
import { AUTH_API, AUTH_BASE } from "../lib/config.ts";

const PROFILE_URL = `${AUTH_BASE}/voters/profile`;

export function TopNav() {
  const { user } = useAuth();

  async function handleLogout() {
    // Clear the session server-side, then hard-navigate to the public homepage.
    // We deliberately don't use the context `logout()` here: nulling the user in
    // state would trip the `RequireAuth` gate and bounce the voter to the login
    // page. A full reload to "/" lands them on the landing page instead.
    await signOut(AUTH_API);
    window.location.href = "/";
  }

  return (
    <AppHeader
      brand={
        <Link
          href="/elections"
          className="flex items-center transition-opacity hover:opacity-80"
        >
          <LogoSquare />
          <span className="divider divider-horizontal" />
          <span className="hidden text-sm font-medium text-base-content/60 sm:inline">
            Voting
          </span>
        </Link>
      }
      account={
        user && (
          <AccountMenu user={user} onLogout={handleLogout}>
            <li>
              <Link
                href="/verify"
                className="flex items-center gap-2 rounded-none text-sm"
              >
                <ShieldCheck className="size-4 opacity-60" />
                Verify vote
              </Link>
            </li>
            <li>
              <a
                href={PROFILE_URL}
                className="flex items-center gap-2 rounded-none text-sm"
              >
                <User className="size-4 opacity-60" />
                Account
              </a>
            </li>
          </AccountMenu>
        )
      }
    />
  );
}
