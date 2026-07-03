import { isDevelopment } from "./env.ts";

export type DevLinkGroup = "Frontends" | "Backends";

export type DevLinkIconName =
  "ShieldCheck" | "Vote" | "ClipboardCheck" | "KeyRound" | "Server";

export interface DevLinkConfig {
  readonly label: string;
  readonly href: string;
  readonly color: string;
  readonly group: DevLinkGroup;
  readonly icon: DevLinkIconName;
  readonly newTab?: boolean;
}

const link = (devLink: string, demoLink: string) => {
  if (isDevelopment()) return devLink;
  else return demoLink;
};

export const adminFeLink = link(
  "http://admin.localhost:3000",
  "https://admin.tora-chain-demo.iansel.me",
);

export const votingFeLink = link(
  "http://voting.localhost:3001",
  "https://tora-chain-demo.iansel.me",
);

export const auditingFeLink = link(
  "http://auditing.localhost:3002",
  "https://auditing.tora-chain-demo.iansel.me",
);

export const idpLink = link(
  "http://idp.localhost:8001",
  "https://idp.tora-chain-demo.iansel.me",
);

export const apiLink = link(
  "http://api.localhost:8000",
  "https://api.tora-chain-demo.iansel.me",
);

// The blockchain master node's public, CORS-open HTTP endpoint. Voters' browsers
// read `GET /api/chain` from here to independently cross-check a vote's on-chain
// commitment during verification, so a lying backend cannot fake a match.
export const chainNodeLink = link(
  "http://localhost:7100",
  "https://node.tora-chain-demo.iansel.me",
);

export const DEV_LINKS: readonly DevLinkConfig[] = [
  {
    label: "Admin FE",
    href: adminFeLink,
    color: "#6366f1",
    group: "Frontends",
    icon: "ShieldCheck",
  },
  {
    label: "Voting FE",
    href: votingFeLink,
    color: "#10b981",
    group: "Frontends",
    icon: "Vote",
  },
  {
    label: "Auditing FE",
    href: auditingFeLink,
    color: "#f59e0b",
    group: "Frontends",
    icon: "ClipboardCheck",
  },
  {
    label: "Identity Provider",
    href: idpLink,
    color: "#f43f5e",
    group: "Backends",
    icon: "KeyRound",
  },
  {
    label: "Elections API",
    href: apiLink + "/docs",
    color: "#0ea5e9",
    group: "Backends",
    icon: "Server",
  },
];
