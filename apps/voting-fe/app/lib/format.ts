import type { ElectionStatus } from "../api/elections.ts";

export type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "ghost";

export const STATUS_TONE: Record<ElectionStatus, Tone> = {
  draft: "ghost",
  scheduled: "info",
  active: "success",
  inactive: "warning",
  closed: "neutral",
  archived: "neutral",
};

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function statusLabel(status: ElectionStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
