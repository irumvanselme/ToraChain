"use client";

import { useState, type CSSProperties } from "react";
import { DEV_BANNER } from "@tora-chain/dev-configs";

// Declared locally (this package has no @types/node) so we can reference the
// literal `process.env.NODE_ENV` token that Vite and Next replace at build time.
declare const process: { env: { NODE_ENV?: string } };

function notProduction(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

export interface DevBannerProps {
  /**
   * Whether to render at all. Defaults to "not production" — both Vite and
   * Next statically replace `process.env.NODE_ENV` at build time, so the whole
   * banner is tree-shaken out of production bundles by default.
   */
  enabled?: boolean;
}

const Z_INDEX = 2147483001;

const containerStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  width: 120,
  height: 120,
  pointerEvents: "none",
  zIndex: Z_INDEX,
  overflow: "hidden",
};

// Diagonal strip across the top-right corner, matching Flutter's Debug banner.
const ribbonStyle: CSSProperties = {
  position: "absolute",
  top: 26,
  right: -32,
  width: 140,
  padding: "5px 0",
  background: DEV_BANNER.ribbonColor,
  color: DEV_BANNER.ribbonTextColor,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  textAlign: "center",
  lineHeight: 1,
  transform: "rotate(45deg)",
  boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
  fontFamily: "system-ui, -apple-system, sans-serif",
  cursor: "default",
  pointerEvents: "auto",
  userSelect: "none",
};

const tooltipStyle: CSSProperties = {
  position: "fixed",
  top: 8,
  right: 8,
  maxWidth: 260,
  background: "#1c1917",
  color: "#fef3c7",
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.45,
  padding: "10px 14px",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
  borderLeft: `3px solid ${DEV_BANNER.ribbonColor}`,
  pointerEvents: "none",
  zIndex: Z_INDEX,
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const tooltipHeadingStyle: CSSProperties = {
  display: "block",
  marginBottom: 4,
  color: "#fcd34d",
};

/**
 * Flutter-style diagonal corner ribbon that warns users this app is a
 * development preview. Config comes from {@link DEV_BANNER} in
 * `@tora-chain/dev-configs`. Renders only outside production by default and is
 * fully self-contained (inline styles), so it looks identical across all
 * ToraChain frontends regardless of their CSS framework.
 *
 * ```tsx
 * import { DevBanner } from "@tora-chain/ui-components";
 * // render once near the app root:
 * <DevBanner />
 * ```
 */
export function DevBanner({ enabled = notProduction() }: DevBannerProps) {
  const [hovered, setHovered] = useState(false);

  if (!enabled) return null;

  return (
    <>
      <div style={containerStyle}>
        <div
          style={ribbonStyle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          aria-label={`${DEV_BANNER.tooltipHeading} — ${DEV_BANNER.tooltipBody}`}
        >
          {DEV_BANNER.ribbonLabel}
        </div>
      </div>

      {hovered && (
        <div role="tooltip" style={tooltipStyle}>
          <strong style={tooltipHeadingStyle}>
            {DEV_BANNER.tooltipHeading}
          </strong>
          {DEV_BANNER.tooltipBody}
        </div>
      )}
    </>
  );
}
