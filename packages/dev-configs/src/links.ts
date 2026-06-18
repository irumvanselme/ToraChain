/**
 * Dev navigation targets shown by the `DevLinks` widget (in
 * `@tora-chain/ui-components`). Kept as framework-agnostic data — no React, no
 * icon components — so this package can also be consumed by the Bun backends.
 * Icons are referenced by name and resolved to lucide components by the UI
 * layer (see {@link DevLinkIconName}).
 */

/** Section a link is grouped under in the widget. */
export type DevLinkGroup = "Frontends" | "Backends";

/**
 * Names of the lucide icons used by the default links. The UI layer maps each
 * name to its `lucide-react` component, keeping this package React-free.
 */
export type DevLinkIconName =
  | "ShieldCheck"
  | "Vote"
  | "ClipboardCheck"
  | "KeyRound"
  | "Server";

export interface DevLinkConfig {
  /** Text shown in the chip. */
  readonly label: string;
  /** Destination. Absolute URL or path. */
  readonly href: string;
  /** Accent color for the icon button (any CSS color). */
  readonly color: string;
  /** Section header the link is grouped under. */
  readonly group: DevLinkGroup;
  /** Icon name, resolved to a component by the UI layer. */
  readonly icon: DevLinkIconName;
  /** Open in a new tab. Defaults to `true` in the UI. */
  readonly newTab?: boolean;
}

/**
 * The ToraChain services on their per-workspace `bun run dev` ports. Backend
 * ports collide with the frontend dev servers (auth + admin both want :3000,
 * elections + voting both want :3001), so when running several at once you'll
 * want to override the widget's `links` prop to match your actual setup.
 */
export const DEV_LINKS: readonly DevLinkConfig[] = [
  {
    label: "Admin FE",
    href: "http://localhost:3000",
    color: "#6366f1",
    group: "Frontends",
    icon: "ShieldCheck",
  },
  {
    label: "Voting FE",
    href: "http://localhost:3001",
    color: "#10b981",
    group: "Frontends",
    icon: "Vote",
  },
  {
    label: "Auditing FE",
    href: "http://localhost:3002",
    color: "#f59e0b",
    group: "Frontends",
    icon: "ClipboardCheck",
  },
  {
    label: "Auth API",
    href: "http://localhost:3000",
    color: "#f43f5e",
    group: "Backends",
    icon: "KeyRound",
  },
  {
    label: "Elections API",
    href: "http://localhost:3001",
    color: "#0ea5e9",
    group: "Backends",
    icon: "Server",
  },
];
