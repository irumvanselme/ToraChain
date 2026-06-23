import { AppError } from "../common/errors.ts";
import type { ElectionRow, ElectionStatus } from "./model.ts";

/**
 * Allowed status transitions. Each status can transition to itself (no-op)
 * or to the listed forward states. Terminal states (ended, archived, paused)
 * only allow the self no-op. Anything else is INVALID_STATUS_TRANSITION.
 */
const TRANSITIONS: Record<ElectionStatus, ElectionStatus[]> = {
  draft: ["draft", "enrolling_voters", "scheduled", "active"],
  enrolling_voters: ["enrolling_voters", "scheduled", "paused"],
  scheduled: ["scheduled", "active", "paused"],
  active: ["active", "ended", "paused"],
  ended: ["ended", "archived"],
  archived: ["archived"],
  paused: ["paused"],
};

/** Editing content fields is blocked once an election is past draft stage and running. */
const LOCKED_STATUSES: ReadonlySet<ElectionStatus> = new Set([
  "active",
  "ended",
  "archived",
  "paused",
]);

export const CONTENT_FIELDS = [
  "title",
  "description",
  "startTime",
  "endTime",
] as const;

export function assertValidTransition(
  from: ElectionStatus,
  to: ElectionStatus,
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw AppError.invalidStatusTransition(
      `Cannot change election status from '${from}' to '${to}'.`,
      { from, to },
    );
  }
}

/**
 * Once an election is active or closed, its content fields (title,
 * description, start/end time) are frozen — only status transitions are
 * allowed. Throws ELECTION_LOCKED if a content field would change.
 */
export function assertContentEditable(
  current: ElectionRow,
  next: {
    title?: string;
    description?: string | null;
    startTime?: Date | null;
    endTime?: Date | null;
  },
): void {
  if (!LOCKED_STATUSES.has(current.status)) return;

  const changes: string[] = [];
  if (next.title !== undefined && next.title !== current.title)
    changes.push("title");
  if (
    next.description !== undefined &&
    next.description !== current.description
  )
    changes.push("description");
  if (
    next.startTime !== undefined &&
    next.startTime?.getTime() !== current.startTime?.getTime()
  )
    changes.push("startTime");
  if (
    next.endTime !== undefined &&
    next.endTime?.getTime() !== current.endTime?.getTime()
  )
    changes.push("endTime");

  if (changes.length > 0) {
    throw AppError.electionLocked(
      `Election content cannot be edited while status is '${current.status}'.`,
      { status: current.status, fields: changes },
    );
  }
}

/** Validate that endTime (if both present) is strictly after startTime. */
export function assertTimeWindow(
  startTime: Date | null | undefined,
  endTime: Date | null | undefined,
): void {
  if (startTime && endTime && endTime.getTime() <= startTime.getTime()) {
    throw AppError.validation("endTime must be after startTime.", {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });
  }
}

/** Is the election currently open for voting (active and within its time window)? */
export function isWithinVotingWindow(row: ElectionRow, now: Date): boolean {
  if (row.status !== "active") return false;
  if (row.startTime && now.getTime() < row.startTime.getTime()) return false;
  if (row.endTime && now.getTime() > row.endTime.getTime()) return false;
  return true;
}

/** Statuses during which voters may check eligibility and enroll. */
export function isEnrollmentOpen(row: ElectionRow): boolean {
  return row.status === "enrolling_voters";
}
