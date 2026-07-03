"use client";

import { AUDIT_API } from "../lib/config.ts";
import { apiGet } from "@/app/api/request";

export interface AuditElection {
  electionId: string;
  title: string;
  description: string | null;
  status: string;
  startTime: string | null;
  endTime: string | null;
  deleted: boolean;
  totalVotes: number;
}

export interface ElectionListEnvelope {
  data: AuditElection[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CandidateResult {
  candidateId: string;
  fullName: string;
  voteCount: number;
}

export interface ElectionResults {
  electionId: string;
  title: string;
  status: string;
  totalVotes: number;
  candidates: CandidateResult[];
}

export interface BlockEntry {
  index: number;
  electionId: string;
  data: { voter: string; commitment: string };
  timestamp: number;
  prevHash: string;
  hash: string;
}

export function listElections(
  token: string,
  params?: { page?: number; limit?: number; q?: string },
): Promise<ElectionListEnvelope> {
  const url = new URL(`${AUDIT_API}/elections`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.q) url.searchParams.set("q", params.q);
  return apiGet<ElectionListEnvelope>(url.toString(), token);
}

export function getElection(
  token: string,
  electionId: string,
): Promise<AuditElection> {
  return apiGet<AuditElection>(`${AUDIT_API}/elections/${electionId}`, token);
}

export function getElectionResults(
  token: string,
  electionId: string,
): Promise<ElectionResults> {
  return apiGet<ElectionResults>(
    `${AUDIT_API}/elections/${electionId}/results`,
    token,
  );
}

export function getBlockchainData(
  token: string,
  electionId: string,
): Promise<BlockEntry[]> {
  return apiGet<BlockEntry[]>(
    `${AUDIT_API}/elections/${electionId}/blockchain`,
    token,
  );
}
