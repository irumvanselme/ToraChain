import { type ReactNode } from "react";
import { cn } from "../cn.ts";

export interface AppHeaderProps {
  brand?: ReactNode;
  actions?: ReactNode;
  account?: ReactNode;
  nav?: ReactNode;
  className?: string;
  containerClassName?: string;
}

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
          "flex min-h-14 w-full container mx-auto px-1 items-center gap-3",
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
              "flex w-full container mx-auto px-1 items-center gap-1 overflow-x-auto",
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
