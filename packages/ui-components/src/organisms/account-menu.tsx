"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { cn } from "../cn.ts";

export interface AccountUser {
  /** Display name; falls back to the email when absent. */
  name?: string | null;
  email?: string | null;
}

export interface AccountMenuProps {
  /** The signed-in user. */
  user: AccountUser;
  /**
   * Sign-out handler. When provided, a "Log out" item is shown; the menu tracks
   * its own pending state and disables the item while the promise is in flight.
   * Omit to hide the log-out item (e.g. apps without a session).
   */
  onLogout?: () => void | Promise<void>;
  /** Extra menu items rendered between the account header and log-out. */
  children?: ReactNode;
  /** Label for the log-out item. Defaults to `"Log out"`. */
  logoutLabel?: string;
  /** Extra classes for the trigger button. */
  className?: string;
}

function initialsOf(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Avatar button that opens a dropdown with the signed-in user's name/email and
 * a log-out action. Framework-agnostic — pass the user and an `onLogout`
 * handler; render router links (Next `<Link>`, react-router `<NavLink>`, …) or
 * plain `<a>` as `children` for additional items like "Account".
 */
export function AccountMenu({
  user,
  onLogout,
  children,
  logoutLabel = "Log out",
  className,
}: AccountMenuProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = user.name ?? user.email ?? "";
  const initials = initialsOf(displayName);

  async function handleLogout() {
    if (!onLogout || loggingOut) return;
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="dropdown dropdown-end">
      <button
        tabIndex={0}
        type="button"
        aria-label="Account menu"
        className={cn("btn btn-ghost btn-sm gap-2 rounded-none", className)}
      >
        <span
          className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-content"
          aria-hidden
        >
          {initials || <User className="size-3.5" />}
        </span>
        <span className="hidden max-w-36 truncate text-sm sm:inline">
          {displayName}
        </span>
        <ChevronDown className="size-3.5 opacity-60" />
      </button>

      <ul
        tabIndex={0}
        className="menu dropdown-content z-50 mt-1 w-56 border border-base-300 bg-base-100 p-1"
      >
        {/* Account header — non-interactive. */}
        <li className="mb-1 border-b border-base-200 px-3 py-2">
          <div className="pointer-events-none flex flex-col gap-0.5 hover:bg-transparent focus:bg-transparent">
            {user.name && (
              <span className="text-sm font-semibold leading-tight">
                {user.name}
              </span>
            )}
            {user.email && (
              <span className="truncate text-xs text-base-content/60">
                {user.email}
              </span>
            )}
          </div>
        </li>

        {children}

        {onLogout && (
          <li>
            <button
              type="button"
              className="flex items-center gap-2 rounded-none text-sm text-error"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <LogOut className="size-4 opacity-60" />
              )}
              {logoutLabel}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
