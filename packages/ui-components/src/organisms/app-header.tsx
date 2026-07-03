import { type ReactNode } from "react";
import { cn } from "../cn.ts";

export interface AppHeaderProps {
  /**
   * Brand / logo, rendered on the far left of the top row. Usually a router
   * link wrapping `<LogoSquare>` / `<LogoText>` and an app label.
   */
  brand?: ReactNode;
  /**
   * Right-aligned actions rendered before the account menu (badges, buttons…).
   */
  actions?: ReactNode;
  /** Account menu, rendered at the far right of the top row (`<AccountMenu>`). */
  account?: ReactNode;
  /**
   * Sub-navigation items. When provided, a second bar renders below the top
   * row with these items (the "platform menu"). Pass router links styled with
   * {@link appNavItemClass}. Omit for apps without a menu.
   */
  nav?: ReactNode;
  /** Extra classes for the sticky `<header>`. */
  className?: string;
  /**
   * Classes for the width-constraining inner rows (shared by the top row and
   * sub-nav so they align). Defaults to a centered `max-w-6xl`; pass e.g.
   * `"max-w-5xl"` to match a narrower page body.
   */
  containerClassName?: string;
}

/**
 * App chrome: a two-tier sticky header. The top row carries the brand and the
 * signed-in user's account menu; when `nav` is supplied a second bar below it
 * holds the platform menu. Framework-agnostic — pass your router's link
 * components as `brand`/`nav` and an `<AccountMenu>` as `account`.
 */
export function AppHeader({
  brand,
  actions,
  account,
  nav,
  className,
  containerClassName,
}: AppHeaderProps) {
  const hasTopEnd = Boolean(actions || account);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-base-300 bg-base-100",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex min-h-14 w-full max-w-6xl items-center gap-3 px-4",
          containerClassName,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">{brand}</div>
        {hasTopEnd && (
          <div className="flex items-center gap-2">
            {actions}
            {account}
          </div>
        )}
      </div>

      {nav && (
        <div className="border-t border-base-300 bg-base-100">
          <nav
            className={cn(
              "mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-2 sm:px-4",
              containerClassName,
            )}
          >
            {nav}
          </nav>
        </div>
      )}
    </header>
  );
}

/**
 * Tab styling for {@link AppHeader} sub-nav items. Apps compute `isActive`
 * from their router (react-router `NavLink`'s `isActive`, or Next's
 * `usePathname`) and spread the result onto their link's `className`.
 */
export function appNavItemClass(isActive: boolean): string {
  return cn(
    "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "border-primary text-primary"
      : "border-transparent text-base-content/60 hover:border-base-300 hover:text-base-content",
  );
}
