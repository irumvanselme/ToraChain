"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import {
  ClipboardCheck,
  KeyRound,
  Server,
  ShieldCheck,
  Vote,
  Wrench,
  X,
} from "lucide-react";
import { DEV_LINKS, type DevLinkIconName } from "@tora-chain/configs";

export type DevLinkIcon = ComponentType<{
  size?: number | string;
  strokeWidth?: number;
  color?: string;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export interface DevLink {
  /** Text shown in the chip. */
  label: string;
  /** Destination. Absolute URL or path. */
  href: string;
  /** lucide-react (or compatible) icon component. */
  icon: DevLinkIcon;
  /** Accent color for the icon button (any CSS color). */
  color: string;
  /** Free-form grouping label shown as a section header (e.g. "Frontends"). */
  group?: string;
  /** Open in a new tab. Defaults to `true`. */
  newTab?: boolean;
}

type Corner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface DevLinksProps {
  /**
   * Links to show. Defaults to {@link DEFAULT_DEV_LINKS} (the ToraChain
   * frontends + backends on their local dev ports).
   */
  links?: DevLink[];
  /**
   * Whether to render at all. Defaults to "not production" — both Vite and
   * Next statically replace `process.env.NODE_ENV` at build time, so the whole
   * widget is tree-shaken out of production bundles by default.
   */
  enabled?: boolean;
  /** Which screen corner to anchor to. Defaults to `"bottom-right"`. */
  position?: Corner;
  /** Tooltip / accessible label for the trigger button. */
  label?: string;
}

/** Resolve the framework-agnostic icon names from dev-configs to components. */
const ICONS: Record<DevLinkIconName, DevLinkIcon> = {
  ShieldCheck,
  Vote,
  ClipboardCheck,
  KeyRound,
  Server,
};

export const DEFAULT_DEV_LINKS: DevLink[] = DEV_LINKS.map((link) => ({
  label: link.label,
  href: link.href,
  color: link.color,
  group: link.group,
  newTab: link.newTab,
  icon: ICONS[link.icon],
}));

const CORNERS: Record<Corner, CSSProperties> = {
  "bottom-right": { bottom: 24, right: 24, alignItems: "flex-end" },
  "bottom-left": { bottom: 24, left: 24, alignItems: "flex-start" },
  "top-right": { top: 24, right: 24, alignItems: "flex-end" },
  "top-left": { top: 24, left: 24, alignItems: "flex-start" },
};

const Z_INDEX = 2147483000;

export function DevLinks({
  links = DEFAULT_DEV_LINKS,
  enabled = true,
  position = "bottom-right",
  label = "Dev links",
}: DevLinksProps) {
  const [open, setOpen] = useState(false);
  // Flips one frame after the stack mounts so the entrance transition runs.
  const [entered, setEntered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Close on outside click and Escape while open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  if (!enabled || links.length === 0) return null;

  const isBottom = position.startsWith("bottom");
  const isRight = position.endsWith("right");
  const enterOffset = isBottom ? 10 : -10;

  // The items stack between the trigger and the anchored edge: above the
  // trigger for bottom corners, below it for top corners.
  const stack = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: isRight ? "flex-end" : "flex-start",
        [isBottom ? "marginBottom" : "marginTop"]: 12,
      }}
    >
      {links.map((link, index) => {
        const Icon = link.icon;
        const newTab = link.newTab ?? true;
        // Stagger from the item closest to the trigger outward.
        const order = isBottom ? links.length - 1 - index : index;
        const showHeader =
          !!link.group && link.group !== links[index - 1]?.group;
        return (
          <div
            key={`${link.label}-${link.href}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isRight ? "flex-end" : "flex-start",
              gap: 6,
              opacity: entered ? 1 : 0,
              transform: entered
                ? "translateY(0) scale(1)"
                : `translateY(${enterOffset}px) scale(0.9)`,
              transition: "opacity 160ms ease, transform 160ms ease",
              transitionDelay: `${entered ? order * 35 : 0}ms`,
            }}
          >
            {showHeader && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  padding: "0 2px",
                }}
              >
                {link.group}
              </span>
            )}
            <a
              href={link.href}
              target={newTab ? "_blank" : undefined}
              rel={newTab ? "noreferrer" : undefined}
              title={link.href}
              style={{
                display: "flex",
                flexDirection: isRight ? "row" : "row-reverse",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  background: "#1e293b",
                  color: "#f8fafc",
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  whiteSpace: "nowrap",
                }}
              >
                {link.label}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: "9999px",
                  background: link.color,
                  color: "#ffffff",
                  flexShrink: 0,
                }}
              >
                <Icon size={20} strokeWidth={2} aria-hidden />
              </span>
            </a>
          </div>
        );
      })}
    </div>
  );

  const trigger = (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      title={label}
      onClick={() => setOpen((value) => !value)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 56,
        height: 56,
        borderRadius: "9999px",
        border: "none",
        cursor: "pointer",
        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
        color: "#ffffff",
        transition: "transform 160ms ease",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
      }}
    >
      {open ? (
        <X size={24} strokeWidth={2.5} aria-hidden />
      ) : (
        <Wrench size={22} strokeWidth={2.25} aria-hidden />
      )}
      {/* DEV badge so the widget reads as a tooling affordance. */}
      <span
        style={{
          position: "absolute",
          top: -4,
          right: -4,
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 0.5,
          color: "#1e1b4b",
          background: "#fbbf24",
          padding: "1px 5px",
          borderRadius: 6,
          transform: open ? "rotate(-90deg)" : "rotate(0deg)",
        }}
      >
        DEV
      </span>
    </button>
  );

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        display: "flex",
        flexDirection: "column",
        zIndex: Z_INDEX,
        ...CORNERS[position],
      }}
    >
      {isBottom ? (
        <>
          {open && stack}
          {trigger}
        </>
      ) : (
        <>
          {trigger}
          {open && stack}
        </>
      )}
    </div>
  );
}
