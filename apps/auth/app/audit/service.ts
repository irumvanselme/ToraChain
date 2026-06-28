import type { AuditOrgRepository, OrgRow } from "./repository.ts";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface OrgStatusDTO {
  orgId: string;
  name: string;
  slug: string;
  approvalStatus: ApprovalStatus;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface OrgListItemDTO extends OrgStatusDTO {
  memberUserId: string;
}

function serializeOrg(row: OrgRow): OrgStatusDTO {
  return {
    orgId: row.id,
    name: row.name,
    slug: row.slug,
    approvalStatus: (row.approvalStatus ?? "pending") as ApprovalStatus,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
  };
}

export class AuditOrgService {
  constructor(private readonly repo: AuditOrgRepository) {}

  async getStatusByUserId(userId: string): Promise<OrgStatusDTO | null> {
    const org = await this.repo.findByUserId(userId);
    if (!org) return null;
    return serializeOrg(org);
  }

  async listOrgs(filter?: ApprovalStatus): Promise<OrgListItemDTO[]> {
    const rows = await this.repo.listAll(filter);
    return rows.map((r) => ({
      ...serializeOrg(r),
      memberUserId: r.memberUserId,
    }));
  }

  async approve(
    orgId: string,
    adminUserId: string,
  ): Promise<OrgStatusDTO | null> {
    const org = await this.repo.approve(orgId, adminUserId);
    if (!org) return null;
    return serializeOrg(org);
  }

  async reject(
    orgId: string,
    reason: string,
    adminUserId: string,
  ): Promise<OrgStatusDTO | null> {
    const org = await this.repo.reject(orgId, reason, adminUserId);
    if (!org) return null;
    return serializeOrg(org);
  }
}
