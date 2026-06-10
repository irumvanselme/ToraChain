import { encodeCursor } from "../common/pagination.ts";
import type { EligibilityWithVoter } from "./model.ts";

/** Normalise an email for storage/lookup (trim + lowercase). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Given one extra row fetched beyond `limit`, split off the page and compute
 * the opaque cursor pointing at the next page (or null when exhausted).
 */
export function paginateRows(
  rows: EligibilityWithVoter[],
  limit: number,
): { page: EligibilityWithVoter[]; nextCursor: string | null } {
  if (rows.length <= limit) {
    return { page: rows, nextCursor: null };
  }
  const page = rows.slice(0, limit);
  const last = page[page.length - 1]!;
  return {
    page,
    nextCursor: encodeCursor({
      createdAt: last.createdAt.toISOString(),
      id: last.eligibilityId,
    }),
  };
}
