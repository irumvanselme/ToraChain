import { request } from "./api";

export const ELECTION_STATUSES = [
  "draft",
  "scheduled",
  "active",
  "inactive",
  "closed",
  "archived",
] as const;

export type ElectionStatus = (typeof ELECTION_STATUSES)[number];

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

export interface CursorEnvelope<T> {
  data: T[];
  nextCursor: string | null;
  limit: number;
}

export interface ListElectionsParams {
  page?: number;
  limit?: number;
  status?: ElectionStatus;
  q?: string;
}

export interface Candidate {
  candidateId: string;
  electionId: string;
  fullName: string;
  manifesto: string | null;
  deleted: boolean;
}

export interface BallotCandidate {
  candidateId: string;
  candidateNumber: string;
  fullName: string;
  votes?: number;
}

export interface Ballot {
  electionId: string;
  status: ElectionStatus;
  voter: {
    voterId: string;
    votingNumber: string;
    hasVoted: boolean;
  };
  candidates: BallotCandidate[];
}

export interface CastResult {
  accepted: true;
  votingNumber: string;
  castAt: string;
}

export interface Eligibility {
  eligibilityId: string;
  voterId: string;
  accountId: string | null;
  electionId: string;
  hasVoted: boolean;
  deleted: boolean;
  externalVoterId: string | null;
}

export function listElections(
  params: ListElectionsParams = {},
  signal?: AbortSignal,
): Promise<OffsetEnvelope<Election>> {
  return request<OffsetEnvelope<Election>>("/elections", {
    query: params as Record<string, string | number | boolean | undefined>,
    signal,
  });
}

export function getElection(
  id: string,
  signal?: AbortSignal,
): Promise<Election> {
  return request<Election>(`/elections/${id}`, { signal });
}

export function listCandidates(
  electionId: string,
  params: { page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<OffsetEnvelope<Candidate>> {
  return request<OffsetEnvelope<Candidate>>(
    `/elections/${electionId}/candidates`,
    {
      query: params as Record<string, string | number | boolean | undefined>,
      signal,
    },
  );
}

export function getVotersByEmail(
  electionId: string,
  email: string,
  signal?: AbortSignal,
): Promise<CursorEnvelope<Eligibility>> {
  return request<CursorEnvelope<Eligibility>>(
    `/elections/${electionId}/voters`,
    { query: { q: email, limit: 20 }, signal },
  );
}

export function getBallot(
  electionId: string,
  voterId: string,
  signal?: AbortSignal,
): Promise<Ballot> {
  return request<Ballot>(`/elections/${electionId}/voter/${voterId}/vote`, {
    signal,
  });
}

export function castVote(
  electionId: string,
  voterId: string,
  candidateId: string,
  signal?: AbortSignal,
): Promise<CastResult> {
  return request<CastResult>(`/elections/${electionId}/voter/${voterId}/vote`, {
    method: "POST",
    body: { candidateId },
    signal,
  });
}
