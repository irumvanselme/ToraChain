import { randomUUID } from "node:crypto";

import type { OffsetParams } from "../common/pagination.ts";
import type { Cursor } from "../common/pagination.ts";
import type { ElectionInsert, ElectionRow } from "../elections/model.ts";
import type {
  ElectionListFilter,
  ElectionsRepository,
} from "../elections/repository.ts";
import type { CandidateInsert, CandidateRow } from "../candidates/model.ts";
import type {
  CandidateListFilter,
  CandidatesRepository,
} from "../candidates/repository.ts";
import type {
  EligibilityInsert,
  EligibilityRow,
  EligibilityWithVoter,
  VoterInsert,
  VoterRow,
} from "../voters/model.ts";
import type {
  EligibilityListFilter,
  VotersRepository,
} from "../voters/repository.ts";
import type { RecordVoteInput, VotesRepository } from "../votes/repository.ts";
import type { AuthAccount, AuthDirectory } from "../voters/auth-directory.ts";
import type { AuthCoreClient, CoreVoter } from "../auth/AuthCoreService.ts";

/** Monotonic clock so created_at ordering is deterministic across inserts. */
let clock = 0;
const nextDate = () => new Date(Date.UTC(2026, 0, 1) + clock++ * 1000);

// ---- Elections -----------------------------------------------------------

export class InMemoryElectionsRepository implements ElectionsRepository {
  rows = new Map<string, ElectionRow>();

  seed(partial: Partial<ElectionRow> = {}): ElectionRow {
    const now = nextDate();
    const row: ElectionRow = {
      electionId: partial.electionId ?? randomUUID(),
      electionNumber: partial.electionNumber ?? String(clock),
      title: partial.title ?? "Untitled",
      description: partial.description ?? null,
      status: partial.status ?? "draft",
      startTime: partial.startTime ?? null,
      endTime: partial.endTime ?? null,
      deleted: partial.deleted ?? false,
      createdAt: partial.createdAt ?? now,
      updatedAt: partial.updatedAt ?? now,
    };
    this.rows.set(row.electionId, row);
    return row;
  }

  private match(row: ElectionRow, filter: ElectionListFilter): boolean {
    if (filter.trash && !row.deleted) return false;
    if (!filter.trash && !filter.includeDeleted && row.deleted) return false;
    if (filter.status && row.status !== filter.status) return false;
    if (filter.q && !row.title.toLowerCase().includes(filter.q.toLowerCase()))
      return false;
    return true;
  }

  async list(filter: ElectionListFilter, page: OffsetParams) {
    const all = [...this.rows.values()]
      .filter((r) => this.match(r, filter))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      rows: all.slice(page.offset, page.offset + page.limit),
      total: all.length,
    };
  }

  async findById(id: string, includeDeleted = false) {
    const row = this.rows.get(id);
    if (!row) return null;
    if (!includeDeleted && row.deleted) return null;
    return row;
  }

  async findActiveByTitle(title: string) {
    return (
      [...this.rows.values()].find(
        (r) => r.title === title && r.status === "active" && !r.deleted,
      ) ?? null
    );
  }

  async create(values: ElectionInsert) {
    return this.seed({
      ...values,
      electionNumber: values.electionNumber,
    } as Partial<ElectionRow>);
  }

  async update(id: string, values: Partial<ElectionInsert>) {
    const row = this.rows.get(id);
    if (!row) return null;
    const updated = { ...row, ...values, updatedAt: nextDate() } as ElectionRow;
    this.rows.set(id, updated);
    return updated;
  }
}

// ---- Candidates ----------------------------------------------------------

export class InMemoryCandidatesRepository implements CandidatesRepository {
  rows = new Map<string, CandidateRow>();

  seed(partial: Partial<CandidateRow> & { electionId: string }): CandidateRow {
    const now = nextDate();
    const row: CandidateRow = {
      candidateId: partial.candidateId ?? randomUUID(),
      electionId: partial.electionId,
      fullName: partial.fullName ?? "Candidate",
      manifesto: partial.manifesto ?? null,
      candidateNumber: partial.candidateNumber ?? String(clock),
      deleted: partial.deleted ?? false,
      createdAt: partial.createdAt ?? now,
      updatedAt: partial.updatedAt ?? now,
    };
    this.rows.set(row.candidateId, row);
    return row;
  }

  async list(
    electionId: string,
    filter: CandidateListFilter,
    page: OffsetParams,
  ) {
    const all = [...this.rows.values()]
      .filter((r) => r.electionId === electionId)
      .filter((r) => {
        if (filter.trash) return r.deleted;
        if (!filter.includeDeleted && r.deleted) return false;
        if (
          filter.q &&
          !r.fullName.toLowerCase().includes(filter.q.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      rows: all.slice(page.offset, page.offset + page.limit),
      total: all.length,
    };
  }

  async findById(
    electionId: string,
    candidateId: string,
    includeDeleted = false,
  ) {
    const row = this.rows.get(candidateId);
    if (!row || row.electionId !== electionId) return null;
    if (!includeDeleted && row.deleted) return null;
    return row;
  }

  async findAnyById(candidateId: string) {
    const row = this.rows.get(candidateId);
    return row && !row.deleted ? row : null;
  }

  async listAllActive(electionId: string) {
    return [...this.rows.values()]
      .filter((r) => r.electionId === electionId && !r.deleted)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async create(values: CandidateInsert) {
    return this.seed({ ...values } as Partial<CandidateRow> & {
      electionId: string;
    });
  }

  async update(candidateId: string, values: Partial<CandidateInsert>) {
    const row = this.rows.get(candidateId);
    if (!row) return null;
    const updated = {
      ...row,
      ...values,
      updatedAt: nextDate(),
    } as CandidateRow;
    this.rows.set(candidateId, updated);
    return updated;
  }
}

// ---- Voters / eligibility ------------------------------------------------

export class InMemoryVotersRepository implements VotersRepository {
  voters = new Map<string, VoterRow>();
  eligibilities = new Map<string, EligibilityRow>();

  seedVoter(partial: Partial<VoterRow> = {}): VoterRow {
    const now = nextDate();
    const row: VoterRow = {
      voterId: partial.voterId ?? randomUUID(),
      email: partial.email ?? `voter-${clock}@example.com`,
      accountId: partial.accountId ?? null,
      createdAt: partial.createdAt ?? now,
      updatedAt: partial.updatedAt ?? now,
    };
    this.voters.set(row.voterId, row);
    return row;
  }

  seedEligibility(
    partial: Partial<EligibilityRow> & { voterId: string; electionId: string },
  ): EligibilityRow {
    const now = nextDate();
    const row: EligibilityRow = {
      eligibilityId: partial.eligibilityId ?? randomUUID(),
      votingNumber: partial.votingNumber ?? String(clock),
      voterId: partial.voterId,
      electionId: partial.electionId,
      hasVoted: partial.hasVoted ?? false,
      deleted: partial.deleted ?? false,
      externalVoterId: partial.externalVoterId ?? null,
      createdAt: partial.createdAt ?? now,
      updatedAt: partial.updatedAt ?? now,
    };
    this.eligibilities.set(row.eligibilityId, row);
    return row;
  }

  private join(row: EligibilityRow): EligibilityWithVoter {
    const voter = this.voters.get(row.voterId)!;
    return { ...row, email: voter.email, accountId: voter.accountId };
  }

  async listEligibilities(
    electionId: string,
    filter: EligibilityListFilter,
    limit: number,
    cursor: Cursor | null,
  ): Promise<EligibilityWithVoter[]> {
    let all = [...this.eligibilities.values()]
      .filter((r) => r.electionId === electionId)
      .filter((r) => {
        if (filter.trash) return r.deleted;
        if (!filter.includeDeleted && r.deleted) return false;
        if (filter.hasVoted !== undefined && r.hasVoted !== filter.hasVoted)
          return false;
        if (filter.q) {
          const email = this.voters.get(r.voterId)?.email ?? "";
          if (!email.toLowerCase().includes(filter.q.toLowerCase()))
            return false;
        }
        return true;
      })
      .sort((a, b) => {
        const t = a.createdAt.getTime() - b.createdAt.getTime();
        return t !== 0 ? t : a.eligibilityId.localeCompare(b.eligibilityId);
      });

    if (cursor) {
      const at = new Date(cursor.createdAt).getTime();
      all = all.filter(
        (r) =>
          r.createdAt.getTime() > at ||
          (r.createdAt.getTime() === at && r.eligibilityId > cursor.id),
      );
    }

    return all.slice(0, limit).map((r) => this.join(r));
  }

  async findEligibility(
    electionId: string,
    voterId: string,
    includeDeleted = false,
  ) {
    const row = [...this.eligibilities.values()].find(
      (r) => r.electionId === electionId && r.voterId === voterId,
    );
    if (!row) return null;
    if (!includeDeleted && row.deleted) return null;
    return this.join(row);
  }

  async findVoterByEmail(email: string) {
    return [...this.voters.values()].find((v) => v.email === email) ?? null;
  }

  async findVoterById(voterId: string) {
    return this.voters.get(voterId) ?? null;
  }

  async createVoter(values: VoterInsert) {
    return this.seedVoter(values as Partial<VoterRow>);
  }

  async updateVoter(voterId: string, values: Partial<VoterInsert>) {
    const row = this.voters.get(voterId);
    if (!row) return null;
    const updated = { ...row, ...values, updatedAt: nextDate() } as VoterRow;
    this.voters.set(voterId, updated);
    return updated;
  }

  async createEligibility(values: EligibilityInsert) {
    return this.seedEligibility(
      values as Partial<EligibilityRow> & {
        voterId: string;
        electionId: string;
      },
    );
  }

  async updateEligibility(
    eligibilityId: string,
    values: Partial<EligibilityInsert>,
  ) {
    const row = this.eligibilities.get(eligibilityId);
    if (!row) return null;
    const updated = {
      ...row,
      ...values,
      updatedAt: nextDate(),
    } as EligibilityRow;
    this.eligibilities.set(eligibilityId, updated);
    return updated;
  }
}

// ---- Votes ---------------------------------------------------------------

export class InMemoryVotesRepository implements VotesRepository {
  records: RecordVoteInput[] = [];

  constructor(private readonly voters: InMemoryVotersRepository) {}

  async recordVote(input: RecordVoteInput) {
    const eligibility = this.voters.eligibilities.get(input.eligibilityId);
    if (!eligibility || eligibility.hasVoted) return null;
    await this.voters.updateEligibility(input.eligibilityId, {
      hasVoted: true,
    });
    this.records.push(input);
    return { castAt: nextDate() };
  }

  async tallies(electionId: string) {
    const counts = new Map<string, number>();
    for (const r of this.records.filter((v) => v.electionId === electionId)) {
      counts.set(r.candidateId, (counts.get(r.candidateId) ?? 0) + 1);
    }
    return [...counts.entries()].map(([candidateId, count]) => ({
      candidateId,
      count,
    }));
  }
}

// ---- Auth directory ------------------------------------------------------

export class FakeAuthDirectory implements AuthDirectory {
  readonly enforced: boolean;
  private readonly accounts = new Map<string, AuthAccount>();

  constructor(enforced = true) {
    this.enforced = enforced;
  }

  add(email: string, accountId: string = randomUUID()): this {
    this.accounts.set(email.toLowerCase(), { email, accountId });
    return this;
  }

  async findAccountByEmail(email: string) {
    return this.accounts.get(email.toLowerCase()) ?? null;
  }
}

// ---- Auth /core client ---------------------------------------------------

/** In-memory stand-in for the auth /core API used in unit + integration tests. */
export class FakeAuthCore implements AuthCoreClient {
  readonly enabled: boolean;
  private readonly voters = new Map<string, CoreVoter>();

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  add(voter: Partial<CoreVoter> & { id: string; email: string }): this {
    this.voters.set(voter.id, {
      id: voter.id,
      name: voter.name ?? "Test Voter",
      email: voter.email,
      emailVerified: voter.emailVerified ?? true,
    });
    return this;
  }

  async getVoter(voterUserId: string): Promise<CoreVoter | null> {
    return this.voters.get(voterUserId) ?? null;
  }
}
