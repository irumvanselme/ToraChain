import { CORE_API } from "lib/config";
import { request } from "api/request";

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** An auditor organization's application, as returned by the auth service. */
export interface AuditOrg {
  orgId: string;
  name: string;
  slug: string;
  approvalStatus: ApprovalStatus;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface AuditOrgListItem extends AuditOrg {
  memberUserId: string;
}

const root = `${CORE_API}/audit-orgs`;

export function listAuditOrgs(
  filter?: ApprovalStatus,
  signal?: AbortSignal,
): Promise<AuditOrgListItem[]> {
  return request<AuditOrgListItem[]>(root, { query: { filter }, signal });
}

export function approveAuditOrg(orgId: string): Promise<AuditOrg> {
  return request<AuditOrg>(`${root}/${orgId}/approve`, {
    method: "POST",
    body: {},
  });
}

export function rejectAuditOrg(
  orgId: string,
  reason: string,
): Promise<AuditOrg> {
  return request<AuditOrg>(`${root}/${orgId}/reject`, {
    method: "POST",
    body: { reason },
  });
}
