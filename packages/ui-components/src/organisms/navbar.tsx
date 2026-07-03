"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "../cn.ts";

type Breakpoint = "sm" | "md" | "lg" | "xl";

/**
 * Static responsive class fragments per breakpoint. They're spelled out in
 * full (rather than built as `${bp}:hidden`) so Tailwind's content scanner can
 * see them — interpolated class names get purged.
 *
 * - `inline`   — primary nav visible only at/above the breakpoint.
 * - `belowOnly` — burger button / mobile menu visible only below it.
 */
const COLLAPSE: Record<Breakpoint, { inline: string; belowOnly: string }> = {
  sm: { inline: "hidden sm:flex", belowOnly: "sm:hidden" },
  md: { inline: "hidden md:flex", belowOnly: "md:hidden" },
  lg: { inline: "hidden lg:flex", belowOnly: "lg:hidden" },
  xl: { inline: "hidden xl:flex", belowOnly: "xl:hidden" },
};

export interface NavbarProps {
  /** Brand / logo, rendered on the left and always visible. */
  brand?: ReactNode;
  /**
   * Primary navigation links. Rendered inline at/above `collapseAt` and
   * tucked behind a burger-triggered dropdown below it. Omit when the navbar
   * has no primary links — then no burger is shown.
   */
  children?: ReactNode;
  /** Right-aligned actions (account menu, sign-out). Always visible. */
  end?: ReactNode;
  /** Breakpoint at which links collapse into the burger. Defaults to `"lg"`. */
  collapseAt?: Breakpoint;
  /** Extra classes for the sticky `<header>`. */
  className?: string;
  /**
   * Classes for the inner width-constraining row. Defaults to a centered
   * `max-w-6xl`; pass e.g. `"max-w-4xl"` to match a narrower page body.
   */
  containerClassName?: string;
}

/**
 * Responsive top navigation bar. Framework-agnostic: pass your router's link
 * component (react-router `NavLink`, Next `Link`, …) as `brand`/`children`.
 * Primary links (`children`) collapse into a mobile burger menu below
 * `collapseAt`; tapping any link — or the backdrop / Escape — closes it.
 */
export function Navbar({
  brand,
  children,
  end,
  collapseAt = "lg",
  className,
  containerClassName,
}: NavbarProps) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuId = useId();
  const bp = COLLAPSE[collapseAt];
  const hasNav = Boolean(children);

  // Close the mobile menu on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-40 border-b border-base-300 bg-base-100",
        className,
      )}
    >
      <div
        className={cn(
          "navbar mx-auto w-full max-w-6xl gap-2 px-4",
          containerClassName,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {hasNav && (
            <button
              type="button"
              aria-label={
                open ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((value) => !value)}
              className={cn("btn btn-square btn-ghost btn-sm", bp.belowOnly)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          )}
          {brand}
          {hasNav && (
            <nav className={cn("items-center gap-1", bp.inline)}>
              {children}
            </nav>
          )}
        </div>

        {end && <div className="flex items-center gap-2">{end}</div>}
      </div>

      {/* Mobile dropdown — rendered below the bar, only while open. Utilities
          layer wins over DaisyUI's `.btn`, so any button child stretches to a
          full-width, left-aligned menu row. */}
      {hasNav && open && (
        <nav
          id={menuId}
          onClick={() => setOpen(false)}
          className={cn(
            "flex flex-col gap-1 border-t border-base-300 px-4 py-2 [&>*]:w-full [&>*]:justify-start",
            bp.belowOnly,
          )}
        >
          {children}
        </nav>
      )}
    </header>
  );
}
