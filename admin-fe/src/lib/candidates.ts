import { API_BASE } from "../config.ts";
import { request } from "./api.ts";
import type { OffsetEnvelope } from "./elections.ts";

/** A candidate standing in an election (mirrors the backend `CandidateSchema`). */
export interface Candidate {
  candidateId: string;
  electionId: string;
  fullName: string;
  manifesto: string | null;
  deleted: boolean;
}

/** Fields editable through the add/edit forms. */
export interface CandidateInput {
  fullName: string;
  manifesto: string | null;
}

export interface ListCandidatesParams {
  page?: number;
  limit?: number;
  q?: string;
  includeDeleted?: boolean;
  trash?: boolean;
}

const root = (electionId: string) =>
  `${API_BASE}/elections/${electionId}/candidates`;

export function listCandidates(
  electionId: string,
  params: ListCandidatesParams = {},
  signal?: AbortSignal,
): Promise<OffsetEnvelope<Candidate>> {
  return request<OffsetEnvelope<Candidate>>(root(electionId), {
    query: params as Record<string, string | number | boolean | undefined>,
    signal,
  });
}

export function createCandidate(
  electionId: string,
  input: CandidateInput,
): Promise<Candidate> {
  return request<Candidate>(root(electionId), { method: "POST", body: input });
}

export function updateCandidate(
  electionId: string,
  candidateId: string,
  input: Partial<CandidateInput>,
): Promise<Candidate> {
  return request<Candidate>(`${root(electionId)}/${candidateId}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteCandidate(
  electionId: string,
  candidateId: string,
): Promise<{ candidateId: string; deleted: true }> {
  return request(`${root(electionId)}/${candidateId}`, { method: "DELETE" });
}
