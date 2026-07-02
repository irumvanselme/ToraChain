import type { ElectionStatus } from "../api/elections.ts";

export type Tone =
  "neutral" | "info" | "success" | "warning" | "error" | "ghost";

export const STATUS_TONE: Record<ElectionStatus, Tone> = {
  draft: "ghost",
  enrolling_voters: "info",
  scheduled: "warning",
  active: "success",
  ended: "neutral",
  archived: "neutral",
  paused: "error",
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
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
