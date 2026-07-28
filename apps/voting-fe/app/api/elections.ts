import { request } from "./request";

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
  /** Half of the voter's `<voteId>:<key>` receipt — see `lib/receipt.ts`. */
  voteId: string;
  votingNumber: string;
  castAt: string;
}

export interface VerifyResult {
  voteId: string;
  electionId: string;
  countedCandidateId: string;
  ciphertext: string | null;
  commitment: string | null;
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

export interface CastVotePayload {
  candidateId: string;
  // Optional vote-verification receipt data produced client-side. When present,
  // the server anchors the commitment (not the candidate) on the blockchain.
  ciphertext?: string;
  commitment?: string;
}

export function castVote(
  electionId: string,
  voterId: string,
  payload: CastVotePayload,
  signal?: AbortSignal,
): Promise<CastResult> {
  return request<CastResult>(`/elections/${electionId}/voter/${voterId}/vote`, {
    method: "POST",
    body: payload,
    signal,
  });
}

/**
 * Fetch the stored side of one ballot (counted candidate + encrypted ballot +
 * on-chain commitment) so the client can decrypt the receipt locally and
 * confirm it matches.
 *
 * Addressed by the `voteId` from the voter's receipt, not by voter: the backend
 * keeps no link between a voter and their ballot, so there is no "my vote"
 * lookup to make. Possession of the unguessable id is the authorisation, and
 * what comes back stays sealed without the receipt key.
 */
export function verifyVote(
  voteId: string,
  signal?: AbortSignal,
): Promise<VerifyResult> {
  return request<VerifyResult>(`/votes/${voteId}/verify`, { signal });
}
