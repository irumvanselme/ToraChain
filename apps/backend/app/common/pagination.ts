import { AppError } from "./errors.ts";

// ---- Offset pagination (Elections, Candidates) ---------------------------

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface OffsetParams {
  page: number;
  limit: number;
  offset: number;
}

export interface OffsetPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OffsetEnvelope<T> {
  data: T[];
  pagination: OffsetPagination;
}

export function normalizeOffset(query: {
  page?: number;
  limit?: number;
}): OffsetParams {
  const page =
    query.page && query.page > 0 ? Math.floor(query.page) : DEFAULT_PAGE;
  const rawLimit =
    query.limit && query.limit > 0 ? Math.floor(query.limit) : DEFAULT_LIMIT;
  const limit = Math.min(rawLimit, MAX_LIMIT);
  return { page, limit, offset: (page - 1) * limit };
}

export function offsetEnvelope<T>(
  data: T[],
  params: OffsetParams,
  total: number,
): OffsetEnvelope<T> {
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: params.limit > 0 ? Math.ceil(total / params.limit) : 0,
    },
  };
}

// ---- Cursor pagination (Voters) ------------------------------------------

export const DEFAULT_CURSOR_LIMIT = 50;

export interface CursorPagination {
  limit: number;
  nextCursor: string | null;
}

export interface CursorEnvelope<T> {
  data: T[];
  pagination: CursorPagination;
}

/** A keyset cursor over `(createdAt, id)` — stable for append-mostly tables. */
export interface Cursor {
  createdAt: string;
  id: string;
}

export function normalizeCursorLimit(limit?: number): number {
  const raw = limit && limit > 0 ? Math.floor(limit) : DEFAULT_CURSOR_LIMIT;
  return Math.min(raw, MAX_LIMIT);
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`, "utf8").toString(
    "base64url",
  );
}

export function decodeCursor(raw: string): Cursor {
  let decoded: string;
  try {
    decoded = Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    throw AppError.validation("Invalid cursor.", { cursor: raw });
  }
  const sep = decoded.lastIndexOf("|");
  if (sep <= 0) {
    throw AppError.validation("Invalid cursor.", { cursor: raw });
  }
  return { createdAt: decoded.slice(0, sep), id: decoded.slice(sep + 1) };
}

export function cursorEnvelope<T>(
  data: T[],
  limit: number,
  nextCursor: string | null,
): CursorEnvelope<T> {
  return { data, pagination: { limit, nextCursor } };
}
