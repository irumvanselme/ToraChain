import { API_BASE } from "lib/config";
import { request } from "api/request";

export interface Eligibility {
  eligibilityId: string;
  voterId: string;
  accountId: string | null;
  electionId: string;
  hasVoted: boolean;
  deleted: boolean;
  externalVoterId: string | null;
}

export interface CursorPagination {
  limit: number;
  nextCursor: string | null;
}

export interface CursorEnvelope<T> {
  data: T[];
  pagination: CursorPagination;
}

export interface ListVotersParams {
  cursor?: string;
  limit?: number;
  hasVoted?: boolean;
  q?: string;
  includeDeleted?: boolean;
  trash?: boolean;
}

/** Grant eligibility by `email` or by `voterUserId`; at least one is required. */
export interface GrantVoterInput {
  email?: string;
  voterUserId?: string;
}

const root = (electionId: string) =>
  `${API_BASE}/elections/${electionId}/voters`;

export function listVoters(
  electionId: string,
  params: ListVotersParams = {},
  signal?: AbortSignal,
): Promise<CursorEnvelope<Eligibility>> {
  return request<CursorEnvelope<Eligibility>>(root(electionId), {
    query: params as Record<string, string | number | boolean | undefined>,
    signal,
  });
}

export function grantVoter(
  electionId: string,
  input: GrantVoterInput,
): Promise<Eligibility> {
  return request<Eligibility>(root(electionId), {
    method: "POST",
    body: input,
  });
}

export function updateVoter(
  electionId: string,
  voterId: string,
  input: { email: string },
): Promise<Eligibility> {
  return request<Eligibility>(`${root(electionId)}/${voterId}`, {
    method: "PATCH",
    body: input,
  });
}

export function revokeVoter(
  electionId: string,
  voterId: string,
): Promise<{ eligibilityId: string; deleted: true }> {
  return request(`${root(electionId)}/${voterId}`, { method: "DELETE" });
}
