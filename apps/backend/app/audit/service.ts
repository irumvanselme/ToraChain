import { eq, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  normalizeOffset,
  offsetEnvelope,
  type OffsetEnvelope,
} from "../common/pagination.ts";
import { AppError } from "../common/errors.ts";
import { type ElectionDTO, serializeElection } from "../elections/model.ts";
import { candidates } from "../candidates/model.ts";
import { votes } from "../votes/model.ts";
import type { ElectionsRepository } from "../elections/repository.ts";

export interface AuditElectionDTO extends ElectionDTO {
  totalVotes: number;
}

export interface CandidateResultDTO {
  candidateId: string;
  fullName: string;
  voteCount: number;
}

export interface ElectionResultsDTO {
  electionId: string;
  title: string;
  status: string;
  totalVotes: number;
  candidates: CandidateResultDTO[];
}

// Mirrors the chain-node's `SerializedBlock` (@tora-chain/specs). Blocks are
// deliberately anonymised: `data.voter` is a bigint-string derived from the
// voting number and `data.commitment` is a hiding SHA-256 commitment to the
// ballot — no candidate or voter identity is ever placed on-chain.
export interface BlockEntry {
  index: number;
  electionId: string;
  data: { voter: string; commitment: string };
  timestamp: number;
  prevHash: string;
  hash: string;
}

export class AuditService {
  constructor(
    private readonly db: NodePgDatabase,
    private readonly electionsRepo: ElectionsRepository,
    private readonly chainNodeUrl?: string,
  ) {}

  async listElections(query: {
    page?: number;
    limit?: number;
    q?: string;
  }): Promise<OffsetEnvelope<AuditElectionDTO>> {
    const page = normalizeOffset(query);

    const { rows, total } = await this.electionsRepo.list(
      {
        status: undefined,
        q: query.q,
        includeDeleted: false,
      },
      page,
    );

    // Filter to only active and ended elections (auditors should not see drafts)
    const visible = rows.filter(
      (r) => r.status === "active" || r.status === "ended",
    );

    // Get vote counts for each visible election
    const electionIds = visible.map((r) => r.electionId);
    const tallies = electionIds.length
      ? await this.db
          .select({
            electionId: votes.electionId,
            voteCount: sql<number>`count(*)::int`,
          })
          .from(votes)
          .where(inArray(votes.electionId, electionIds))
          .groupBy(votes.electionId)
      : [];

    const countByElection = new Map<string, number>();
    for (const t of tallies) {
      countByElection.set(t.electionId, t.voteCount);
    }

    const dtos: AuditElectionDTO[] = visible.map((r) => ({
      ...serializeElection(r),
      totalVotes: countByElection.get(r.electionId) ?? 0,
    }));

    return offsetEnvelope(dtos, page, total);
  }

  async getElection(id: string): Promise<AuditElectionDTO> {
    const row = await this.electionsRepo.findById(id, false);
    if (!row || (row.status !== "active" && row.status !== "ended")) {
      throw AppError.notFound(`Election ${id} was not found.`);
    }

    const [tally] = await this.db
      .select({ voteCount: sql<number>`count(*)::int` })
      .from(votes)
      .where(eq(votes.electionId, id));

    return {
      ...serializeElection(row),
      totalVotes: tally?.voteCount ?? 0,
    };
  }

  async getResults(electionId: string): Promise<ElectionResultsDTO> {
    const row = await this.electionsRepo.findById(electionId, false);
    if (!row || (row.status !== "active" && row.status !== "ended")) {
      throw AppError.notFound(`Election ${electionId} was not found.`);
    }

    const candidateRows = await this.db
      .select({
        candidateId: candidates.candidateId,
        fullName: candidates.fullName,
      })
      .from(candidates)
      .where(eq(candidates.electionId, electionId));

    const voteRows = await this.db
      .select({ candidateId: votes.candidateId })
      .from(votes)
      .where(eq(votes.electionId, electionId));

    const countMap = new Map<string, number>();
    for (const v of voteRows) {
      countMap.set(v.candidateId, (countMap.get(v.candidateId) ?? 0) + 1);
    }

    const candidateResults: CandidateResultDTO[] = candidateRows.map((c) => ({
      candidateId: c.candidateId,
      fullName: c.fullName,
      voteCount: countMap.get(c.candidateId) ?? 0,
    }));

    return {
      electionId,
      title: row.title,
      status: row.status,
      totalVotes: voteRows.length,
      candidates: candidateResults,
    };
  }

  async getBlockchainData(electionId: string): Promise<BlockEntry[]> {
    const row = await this.electionsRepo.findById(electionId, false);
    if (!row || (row.status !== "active" && row.status !== "ended")) {
      throw AppError.notFound(`Election ${electionId} was not found.`);
    }

    if (!this.chainNodeUrl) {
      throw AppError.internal(
        "Blockchain node is not configured. Set CHAIN_NODE_URL to enable blockchain downloads.",
      );
    }

    let res: Response;
    try {
      res = await fetch(
        `${this.chainNodeUrl}/api/chain?electionId=${encodeURIComponent(electionId)}`,
      );
    } catch {
      throw AppError.internal("Could not reach the chain-node service.");
    }

    if (!res.ok) {
      throw AppError.internal("Chain-node returned an unexpected error.");
    }

    // The chain-node wraps its blocks in a `{ blocks: [...] }` envelope and
    // already filters by the `electionId` query param above.
    const body = (await res.json()) as { blocks: BlockEntry[] };
    return body.blocks ?? [];
  }
}
