"use client";

import { AUTH_API, AUTH_BASE } from "../config";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface OrgStatus {
  orgId: string;
  name: string;
  slug: string;
  approvalStatus: ApprovalStatus;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface AuditStatus {
  userId: string;
  name: string;
  email: string;
  org: OrgStatus | null;
}

const AUDIT_STATUS_URL = AUTH_BASE
  ? `${AUTH_BASE.replace(/\/api$/, "")}/audit/status`
  : "";

/**
 * Fetches the current auditor's session + org status from the auth service.
 * Uses the session cookie (credentials: include), not the JWT.
 */
export async function fetchAuditStatus(): Promise<AuditStatus | null> {
  try {
    const res = await fetch(AUDIT_STATUS_URL, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return res.json() as Promise<AuditStatus>;
  } catch {
    return null;
  }
}

/**
 * Creates a new organization for the current auditor via better-auth.
 * Uses the session cookie. The org will be pending until an admin approves.
 */
export async function createOrganization(
  name: string,
  slug: string,
): Promise<{ id: string; name: string } | { error: string }> {
  const res = await fetch(`${AUTH_API}/organization/create`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ name, slug }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    return { error: body.message ?? `HTTP ${res.status}` };
  }

  return res.json() as Promise<{ id: string; name: string }>;
}
