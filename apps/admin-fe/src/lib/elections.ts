import { API_BASE } from "../config.ts";
import { request } from "./api.ts";

/** Election lifecycle states (mirrors the backend `StatusSchema`). */
export const ELECTION_STATUSES = [
  "draft",
  "enrolling_voters",
  "scheduled",
  "active",
  "ended",
  "archived",
  "paused",
] as const;

export type ElectionStatus = (typeof ELECTION_STATUSES)[number];

/** Valid forward transitions from each status. Empty array = terminal state. */
export const STATUS_TRANSITIONS: Record<ElectionStatus, ElectionStatus[]> = {
  draft: ["enrolling_voters"],
  enrolling_voters: ["scheduled", "paused"],
  scheduled: ["active", "paused"],
  active: ["ended", "paused"],
  ended: ["archived"],
  archived: [],
  paused: [],
};

export interface Election {
  electionId: string;
  title: string;
  description: string | null;
  status: ElectionStatus;
  startTime: string | null;
  endTime: string | null;
  deleted: boolean;
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

export interface ListElectionsParams {
  page?: number;
  limit?: number;
  status?: ElectionStatus;
  q?: string;
  includeDeleted?: boolean;
  trash?: boolean;
}

/** Fields editable through the create/edit forms. */
export interface ElectionInput {
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  status: ElectionStatus;
}

const root = `${API_BASE}/elections`;

export function listElections(
  params: ListElectionsParams = {},
  signal?: AbortSignal,
): Promise<OffsetEnvelope<Election>> {
  return request<OffsetEnvelope<Election>>(root, {
    query: params as Record<string, string | number | boolean | undefined>,
    signal,
  });
}

export function getElection(
  id: string,
  signal?: AbortSignal,
): Promise<Election> {
  return request<Election>(`${root}/${id}`, { signal });
}

export function createElection(input: ElectionInput): Promise<Election> {
  return request<Election>(root, { method: "POST", body: input });
}

/** Partial update via PATCH (the form always sends the full set of fields). */
export function updateElection(
  id: string,
  input: Partial<ElectionInput>,
): Promise<Election> {
  return request<Election>(`${root}/${id}`, { method: "PATCH", body: input });
}

export function updateElectionStatus(
  id: string,
  status: ElectionStatus,
): Promise<Election> {
  return request<Election>(`${root}/${id}`, {
    method: "PATCH",
    body: { status },
  });
}

export function deleteElection(
  id: string,
): Promise<{ electionId: string; deleted: true }> {
  return request(`${root}/${id}`, { method: "DELETE" });
}
