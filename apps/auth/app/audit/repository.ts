import { auditorOrgTableNames } from "../types.ts";

export interface Queryable {
  query<R = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

export interface OrgRow {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  approvalStatus: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  approvedBy: string | null;
}

export interface OrgWithMemberRow extends OrgRow {
  memberUserId: string;
  memberRole: string;
}

const { organization: ORG_TABLE, member: MEMBER_TABLE } =
  auditorOrgTableNames();

export class AuditOrgRepository {
  constructor(private readonly db: Queryable) {}

  async findByUserId(userId: string): Promise<OrgRow | null> {
    const { rows } = await this.db.query<OrgRow>(
      `select o."id", o."name", o."slug", o."createdAt",
              o."approvalStatus", o."approvedAt", o."rejectionReason", o."approvedBy"
       from "${ORG_TABLE}" o
       join "${MEMBER_TABLE}" m on m."organizationId" = o."id"
       where m."userId" = $1
       order by o."createdAt" desc
       limit 1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async findById(orgId: string): Promise<OrgRow | null> {
    const { rows } = await this.db.query<OrgRow>(
      `select "id", "name", "slug", "createdAt",
              "approvalStatus", "approvedAt", "rejectionReason", "approvedBy"
       from "${ORG_TABLE}"
       where "id" = $1`,
      [orgId],
    );
    return rows[0] ?? null;
  }

  async listAll(
    filter?: "pending" | "approved" | "rejected",
  ): Promise<OrgWithMemberRow[]> {
    const params: unknown[] = [];
    let where = "";
    if (filter) {
      params.push(filter);
      where = `where o."approvalStatus" = $1`;
    }
    const { rows } = await this.db.query<OrgWithMemberRow>(
      `select o."id", o."name", o."slug", o."createdAt",
              o."approvalStatus", o."approvedAt", o."rejectionReason", o."approvedBy",
              m."userId" as "memberUserId", m."role" as "memberRole"
       from "${ORG_TABLE}" o
       join "${MEMBER_TABLE}" m on m."organizationId" = o."id"
       ${where}
       order by o."createdAt" desc`,
      params,
    );
    return rows;
  }

  async approve(orgId: string, approvedBy: string): Promise<OrgRow | null> {
    const { rows } = await this.db.query<OrgRow>(
      `update "${ORG_TABLE}"
       set "approvalStatus" = 'approved',
           "approvedAt" = CURRENT_TIMESTAMP,
           "approvedBy" = $2,
           "rejectionReason" = null
       where "id" = $1
       returning "id", "name", "slug", "createdAt",
                 "approvalStatus", "approvedAt", "rejectionReason", "approvedBy"`,
      [orgId, approvedBy],
    );
    return rows[0] ?? null;
  }

  async reject(
    orgId: string,
    reason: string,
    rejectedBy: string,
  ): Promise<OrgRow | null> {
    const { rows } = await this.db.query<OrgRow>(
      `update "${ORG_TABLE}"
       set "approvalStatus" = 'rejected',
           "rejectionReason" = $2,
           "approvedBy" = $3,
           "approvedAt" = null
       where "id" = $1
       returning "id", "name", "slug", "createdAt",
                 "approvalStatus", "approvedAt", "rejectionReason", "approvedBy"`,
      [orgId, reason, rejectedBy],
    );
    return rows[0] ?? null;
  }
}
