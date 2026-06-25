import { AppError } from "../common/errors.ts";

export interface AuditorIdentity {
  userId: string;
  name: string;
  email: string;
  orgId: string | null;
  approvalStatus: string | null;
}

/**
 * Verifies an auditor's session by calling the auth service's audit status
 * endpoint. Throws `AppError.unauthenticated` or `AppError.forbidden` when the
 * session is invalid or the organization is not approved.
 */
export async function requireApprovedAuditor(
  auditorsAuthUrl: string,
  authorizationHeader: string | null,
): Promise<AuditorIdentity> {
  if (!authorizationHeader) {
    throw AppError.unauthenticated(
      "An auditor session token is required. Pass it as Authorization: Bearer <token>.",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${auditorsAuthUrl}/auditors/audit/status`, {
      headers: {
        Authorization: authorizationHeader,
        Accept: "application/json",
      },
    });
  } catch (err) {
    throw AppError.internal(
      "Could not reach the auth service to validate the auditor session.",
    );
  }

  if (res.status === 401) {
    throw AppError.unauthenticated("Invalid or expired auditor session.");
  }

  if (!res.ok) {
    throw AppError.internal("Auth service returned an unexpected error.");
  }

  const data = (await res.json()) as {
    userId: string;
    name: string;
    email: string;
    org: {
      orgId: string;
      approvalStatus: string;
    } | null;
  };

  if (!data.org || data.org.approvalStatus !== "approved") {
    throw AppError.forbidden(
      "Your organization has not been approved yet. Please wait for admin approval.",
    );
  }

  return {
    userId: data.userId,
    name: data.name,
    email: data.email,
    orgId: data.org.orgId,
    approvalStatus: data.org.approvalStatus,
  };
}
