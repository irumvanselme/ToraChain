"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@tora-chain/fe-common";
import {
  AccountMenu,
  AppHeader,
  LogoSquare,
  appNavItemClass,
} from "@tora-chain/ui-components";
import { useAudit } from "../lib/audit-context";
import { AUTH_BASE } from "../lib/config.ts";

const PROFILE_URL = `${AUTH_BASE}/profile`;

/** Responsive top navigation for the auditing portal. */
export function AppNav() {
  const { auditStatus } = useAudit();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const orgName = auditStatus?.org?.name;
  const electionsActive =
    pathname === "/dashboard" || pathname.startsWith("/elections");

  return (
    <AppHeader
      brand={
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          <LogoSquare />
          <span className="divider divider-horizontal mx-0" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-semibold">Auditing</span>
            {orgName && (
              <span className="truncate text-xs text-base-content/60">
                {orgName}
              </span>
            )}
          </span>
        </Link>
      }
      account={
        user && (
          <AccountMenu user={user} onLogout={() => logout()}>
            <li>
              <a href={PROFILE_URL} className="rounded-none text-sm">
                Account
              </a>
            </li>
          </AccountMenu>
        )
      }
      nav={
        <Link href="/dashboard" className={appNavItemClass(electionsActive)}>
          Elections
        </Link>
      }
    />
  );
}
