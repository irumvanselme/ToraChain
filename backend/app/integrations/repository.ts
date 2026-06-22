import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  electionIntegrations,
  type IntegrationInsert,
  type IntegrationRow,
} from "./model.ts";

export interface IntegrationsRepository {
  findByElection(electionId: string): Promise<IntegrationRow | null>;
  upsert(values: IntegrationInsert): Promise<IntegrationRow>;
  remove(electionId: string): Promise<boolean>;
}

export class DrizzleIntegrationsRepository implements IntegrationsRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findByElection(electionId: string): Promise<IntegrationRow | null> {
    const [row] = await this.db
      .select()
      .from(electionIntegrations)
      .where(eq(electionIntegrations.electionId, electionId))
      .limit(1);
    return row ?? null;
  }

  async upsert(values: IntegrationInsert): Promise<IntegrationRow> {
    const [row] = await this.db
      .insert(electionIntegrations)
      .values(values)
      .onConflictDoUpdate({
        target: electionIntegrations.electionId,
        set: {
          type: values.type,
          config: values.config,
          formFields: values.formFields,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row!;
  }

  async remove(electionId: string): Promise<boolean> {
    const rows = await this.db
      .delete(electionIntegrations)
      .where(eq(electionIntegrations.electionId, electionId))
      .returning();
    return rows.length > 0;
  }
}
