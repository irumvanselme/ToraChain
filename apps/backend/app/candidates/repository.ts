import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { OffsetParams } from "../common/pagination.ts";
import {
  candidates,
  type CandidateInsert,
  type CandidateRow,
} from "./model.ts";

export interface CandidateListFilter {
  q?: string;
  includeDeleted?: boolean;
  trash?: boolean;
}

export interface CandidatesRepository {
  list(
    electionId: string,
    filter: CandidateListFilter,
    page: OffsetParams,
  ): Promise<{ rows: CandidateRow[]; total: number }>;
  findById(
    electionId: string,
    candidateId: string,
    includeDeleted?: boolean,
  ): Promise<CandidateRow | null>;
  /** Find a (non-deleted) candidate by id regardless of election. */
  findAnyById(candidateId: string): Promise<CandidateRow | null>;
  /** All non-deleted candidates for an election (used by the voting surface). */
  listAllActive(electionId: string): Promise<CandidateRow[]>;
  create(values: CandidateInsert): Promise<CandidateRow>;
  update(
    candidateId: string,
    values: Partial<CandidateInsert>,
  ): Promise<CandidateRow | null>;
}

export class DrizzleCandidatesRepository implements CandidatesRepository {
  constructor(private readonly db: NodePgDatabase) {}

  private deletedFilter(filter: CandidateListFilter) {
    if (filter.trash) return eq(candidates.deleted, true);
    if (filter.includeDeleted) return undefined;
    return eq(candidates.deleted, false);
  }

  async list(
    electionId: string,
    filter: CandidateListFilter,
    page: OffsetParams,
  ) {
    const conditions = [
      eq(candidates.electionId, electionId),
      this.deletedFilter(filter),
      filter.q ? ilike(candidates.fullName, `%${filter.q}%`) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const where = and(...conditions);

    const rows = await this.db
      .select()
      .from(candidates)
      .where(where)
      .orderBy(desc(candidates.createdAt), asc(candidates.candidateId))
      .limit(page.limit)
      .offset(page.offset);

    const [counted] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(candidates)
      .where(where);

    return { rows, total: counted?.count ?? 0 };
  }

  async findById(
    electionId: string,
    candidateId: string,
    includeDeleted = false,
  ) {
    const conditions = [
      eq(candidates.candidateId, candidateId),
      eq(candidates.electionId, electionId),
      includeDeleted ? undefined : eq(candidates.deleted, false),
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const [row] = await this.db
      .select()
      .from(candidates)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findAnyById(candidateId: string) {
    const [row] = await this.db
      .select()
      .from(candidates)
      .where(
        and(
          eq(candidates.candidateId, candidateId),
          eq(candidates.deleted, false),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async listAllActive(electionId: string) {
    return this.db
      .select()
      .from(candidates)
      .where(
        and(
          eq(candidates.electionId, electionId),
          eq(candidates.deleted, false),
        ),
      )
      .orderBy(asc(candidates.createdAt), asc(candidates.candidateId));
  }

  async create(values: CandidateInsert) {
    const [row] = await this.db.insert(candidates).values(values).returning();
    return row!;
  }

  async update(candidateId: string, values: Partial<CandidateInsert>) {
    const [row] = await this.db
      .update(candidates)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(candidates.candidateId, candidateId))
      .returning();
    return row ?? null;
  }
}
