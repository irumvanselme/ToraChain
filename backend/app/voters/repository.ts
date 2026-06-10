import { and, asc, eq, gt, ilike, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { Cursor } from "../common/pagination.ts";
import {
  eligibilities,
  voters,
  type EligibilityInsert,
  type EligibilityRow,
  type EligibilityWithVoter,
  type VoterInsert,
  type VoterRow,
} from "./model.ts";

export interface EligibilityListFilter {
  hasVoted?: boolean;
  q?: string;
  includeDeleted?: boolean;
  trash?: boolean;
}

export interface VotersRepository {
  listEligibilities(
    electionId: string,
    filter: EligibilityListFilter,
    limit: number,
    cursor: Cursor | null,
  ): Promise<EligibilityWithVoter[]>;
  findEligibility(
    electionId: string,
    voterId: string,
    includeDeleted?: boolean,
  ): Promise<EligibilityWithVoter | null>;
  findVoterByEmail(email: string): Promise<VoterRow | null>;
  findVoterById(voterId: string): Promise<VoterRow | null>;
  createVoter(values: VoterInsert): Promise<VoterRow>;
  updateVoter(
    voterId: string,
    values: Partial<VoterInsert>,
  ): Promise<VoterRow | null>;
  createEligibility(values: EligibilityInsert): Promise<EligibilityRow>;
  updateEligibility(
    eligibilityId: string,
    values: Partial<EligibilityInsert>,
  ): Promise<EligibilityRow | null>;
}

const VOTER_COLUMNS = {
  eligibilityId: eligibilities.eligibilityId,
  votingNumber: eligibilities.votingNumber,
  voterId: eligibilities.voterId,
  electionId: eligibilities.electionId,
  hasVoted: eligibilities.hasVoted,
  deleted: eligibilities.deleted,
  createdAt: eligibilities.createdAt,
  updatedAt: eligibilities.updatedAt,
  email: voters.email,
  accountId: voters.accountId,
} as const;

export class DrizzleVotersRepository implements VotersRepository {
  constructor(private readonly db: NodePgDatabase) {}

  private deletedFilter(filter: EligibilityListFilter) {
    if (filter.trash) return eq(eligibilities.deleted, true);
    if (filter.includeDeleted) return undefined;
    return eq(eligibilities.deleted, false);
  }

  async listEligibilities(
    electionId: string,
    filter: EligibilityListFilter,
    limit: number,
    cursor: Cursor | null,
  ): Promise<EligibilityWithVoter[]> {
    const keyset = cursor
      ? (() => {
          const at = new Date(cursor.createdAt);
          return or(
            gt(eligibilities.createdAt, at),
            and(
              eq(eligibilities.createdAt, at),
              gt(eligibilities.eligibilityId, cursor.id),
            ),
          );
        })()
      : undefined;

    const conditions = [
      eq(eligibilities.electionId, electionId),
      this.deletedFilter(filter),
      filter.hasVoted !== undefined
        ? eq(eligibilities.hasVoted, filter.hasVoted)
        : undefined,
      filter.q ? ilike(voters.email, `%${filter.q}%`) : undefined,
      keyset,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    return this.db
      .select(VOTER_COLUMNS)
      .from(eligibilities)
      .innerJoin(voters, eq(voters.voterId, eligibilities.voterId))
      .where(and(...conditions))
      .orderBy(asc(eligibilities.createdAt), asc(eligibilities.eligibilityId))
      .limit(limit);
  }

  async findEligibility(
    electionId: string,
    voterId: string,
    includeDeleted = false,
  ): Promise<EligibilityWithVoter | null> {
    const conditions = [
      eq(eligibilities.electionId, electionId),
      eq(eligibilities.voterId, voterId),
      includeDeleted ? undefined : eq(eligibilities.deleted, false),
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const [row] = await this.db
      .select(VOTER_COLUMNS)
      .from(eligibilities)
      .innerJoin(voters, eq(voters.voterId, eligibilities.voterId))
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findVoterByEmail(email: string) {
    const [row] = await this.db
      .select()
      .from(voters)
      .where(eq(voters.email, email))
      .limit(1);
    return row ?? null;
  }

  async findVoterById(voterId: string) {
    const [row] = await this.db
      .select()
      .from(voters)
      .where(eq(voters.voterId, voterId))
      .limit(1);
    return row ?? null;
  }

  async createVoter(values: VoterInsert) {
    const [row] = await this.db.insert(voters).values(values).returning();
    return row!;
  }

  async updateVoter(voterId: string, values: Partial<VoterInsert>) {
    const [row] = await this.db
      .update(voters)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(voters.voterId, voterId))
      .returning();
    return row ?? null;
  }

  async createEligibility(values: EligibilityInsert) {
    const [row] = await this.db
      .insert(eligibilities)
      .values(values)
      .returning();
    return row!;
  }

  async updateEligibility(
    eligibilityId: string,
    values: Partial<EligibilityInsert>,
  ) {
    const [row] = await this.db
      .update(eligibilities)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(eligibilities.eligibilityId, eligibilityId))
      .returning();
    return row ?? null;
  }
}
