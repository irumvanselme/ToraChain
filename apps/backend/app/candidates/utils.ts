import { AppError } from "../common/errors.ts";
import type { ElectionStatus } from "../elections/model.ts";

/** Candidates may only be added/edited/removed before the election goes active. */
const EDITABLE_STATUSES: ReadonlySet<ElectionStatus> = new Set([
  "draft",
  "enrolling_voters",
  "scheduled",
]);

export function assertCandidatesEditable(status: ElectionStatus): void {
  if (!EDITABLE_STATUSES.has(status)) {
    throw AppError.candidatesLocked(
      `Candidates cannot be modified while the election is '${status}'.`,
      { status },
    );
  }
}
