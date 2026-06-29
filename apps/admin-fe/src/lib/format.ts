import type { ElectionStatus } from "api/elections";

type Tone = "neutral" | "info" | "success" | "warning" | "error" | "ghost";

/** Map an election status to a DaisyUI badge tone. */
export const STATUS_TONE: Record<ElectionStatus, Tone> = {
  draft: "ghost",
  enrolling_voters: "info",
  scheduled: "warning",
  active: "success",
  ended: "neutral",
  archived: "neutral",
  paused: "error",
};

/** Human-readable date-time, or an em dash for null. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Convert an ISO string into the `YYYY-MM-DDTHH:mm` value a
 * `<input type="datetime-local">` expects, in the browser's local time.
 */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Convert a `datetime-local` value back to an ISO string (or null if empty). */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Human-readable label for a status (handles underscore-separated words). */
export function statusLabel(status: ElectionStatus): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
