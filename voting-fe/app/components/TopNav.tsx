"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@tora-chain/fe-common";
import { LogoSquare } from "@tora-chain/ui-components";
import { ChevronDown, LogOut, User } from "lucide-react";
import { AUTH_BASE } from "../config";

const PROFILE_URL = `${AUTH_BASE}/voters/profile`;

export function TopNav() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = user?.name ?? user?.email ?? "";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100">
      <nav className="navbar max-w-6xl mx-auto px-4 min-h-14">
        {/* Brand */}
        <div className="navbar-start">
          <Link
            href="/elections"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <LogoSquare />
            <div className={"divider divider-horizontal"}></div>
            <span className="text-sm font-medium text-base-content/60 hidden sm:inline">
              Voting
            </span>
          </Link>
        </div>

        {/* User menu */}
        <div className="navbar-end">
          <div className="dropdown dropdown-end">
            <button
              tabIndex={0}
              type="button"
              className="btn btn-ghost btn-sm gap-2 rounded-none"
            >
              {/* Avatar */}
              <div
                className="size-7 rounded-full bg-primary text-primary-content text-xs font-bold flex items-center justify-center"
                aria-hidden
              >
                {initials || <User className="size-3.5" />}
              </div>
              <span className="hidden sm:inline max-w-36 truncate text-sm">
                {displayName}
              </span>
              <ChevronDown className="size-3.5 opacity-60" />
            </button>

            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 border border-base-300 p-1 w-56 z-50 mt-1"
            >
              {/* Account info header */}
              <li className="px-3 py-2 mb-1 border-b border-base-200">
                <div className="flex flex-col gap-0.5 pointer-events-none focus:bg-transparent hover:bg-transparent">
                  {user?.name && (
                    <span className="font-semibold text-sm leading-tight">
                      {user.name}
                    </span>
                  )}
                  <span className="text-xs text-base-content/60 truncate">
                    {user?.email}
                  </span>
                </div>
              </li>

              <li>
                <a
                  href={PROFILE_URL}
                  className="flex items-center gap-2 text-sm rounded-none"
                >
                  <User className="size-4 opacity-60" />
                  Account
                </a>
              </li>

              <li>
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm rounded-none text-error"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <LogOut className="size-4 opacity-60" />
                  )}
                  Log out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}
