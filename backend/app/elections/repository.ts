import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { OffsetParams } from "app/common/pagination";
import {
  elections,
  type ElectionInsert,
  type ElectionRow,
  type ElectionStatus,
} from "./model.ts";

export interface ElectionListFilter {
  status?: ElectionStatus;
  q?: string;
  includeDeleted?: boolean;
  trash?: boolean;
}

export interface ElectionsRepository {
  list(
    filter: ElectionListFilter,
    page: OffsetParams,
  ): Promise<{ rows: ElectionRow[]; total: number }>;
  findById(id: string, includeDeleted?: boolean): Promise<ElectionRow | null>;
  findActiveByTitle(title: string): Promise<ElectionRow | null>;
  create(values: ElectionInsert): Promise<ElectionRow>;
  update(
    id: string,
    values: Partial<ElectionInsert>,
  ): Promise<ElectionRow | null>;
}

export class DrizzleElectionsRepository implements ElectionsRepository {
  constructor(private readonly db: NodePgDatabase) {}

  private deletedFilter(filter: ElectionListFilter) {
    if (filter.trash) return eq(elections.deleted, true);
    if (filter.includeDeleted) return undefined;
    return eq(elections.deleted, false);
  }

  async list(filter: ElectionListFilter, page: OffsetParams) {
    const conditions = [
      this.deletedFilter(filter),
      filter.status ? eq(elections.status, filter.status) : undefined,
      filter.q ? ilike(elections.title, `%${filter.q}%`) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(elections)
      .where(where)
      .orderBy(desc(elections.createdAt), asc(elections.electionId))
      .limit(page.limit)
      .offset(page.offset);

    const [counted] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(elections)
      .where(where);

    return { rows, total: counted?.count ?? 0 };
  }

  async findById(id: string, includeDeleted = false) {
    const where = includeDeleted
      ? eq(elections.electionId, id)
      : and(eq(elections.electionId, id), eq(elections.deleted, false));
    const [row] = await this.db.select().from(elections).where(where).limit(1);
    return row ?? null;
  }

  async findActiveByTitle(title: string) {
    const [row] = await this.db
      .select()
      .from(elections)
      .where(
        and(
          eq(elections.title, title),
          eq(elections.status, "active"),
          eq(elections.deleted, false),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async create(values: ElectionInsert) {
    const [row] = await this.db.insert(elections).values(values).returning();
    return row!;
  }

  async update(id: string, values: Partial<ElectionInsert>) {
    const [row] = await this.db
      .update(elections)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(elections.electionId, id))
      .returning();
    return row ?? null;
  }
}
