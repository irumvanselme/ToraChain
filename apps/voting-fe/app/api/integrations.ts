import { request } from "./request.ts";
import type { Eligibility } from "./elections.ts";

export interface FormField {
  id: string;
  label: string;
  type: string | null;
  description: string;
}

export interface Integration {
  integrationId: string;
  electionId: string;
  type: string;
  config: Record<string, unknown>;
  formFields: FormField[];
}

export interface CheckResult {
  eligible: boolean;
  externalVoterId?: string;
  /** Human-readable reason from the integration when not eligible. */
  reason?: string;
}

export function getIntegration(
  electionId: string,
  signal?: AbortSignal,
): Promise<Integration | null> {
  return request<Integration>(`/elections/${electionId}/integration`, {
    signal,
  }).catch((err) => {
    if ("status" in err && err.status === 404) return null;
    throw err;
  });
}

export function checkEligibility(
  electionId: string,
  voterAccountId: string,
  fields: Record<string, string>,
  signal?: AbortSignal,
): Promise<CheckResult> {
  return request<CheckResult>(`/elections/${electionId}/eligibility-check`, {
    method: "POST",
    body: { voterAccountId, fields },
    signal,
  });
}

export function enrollVoter(
  electionId: string,
  voterAccountId: string,
  email: string,
  fields: Record<string, string>,
): Promise<Eligibility> {
  return request<Eligibility>(`/elections/${electionId}/enroll`, {
    method: "POST",
    body: { voterAccountId, email, fields },
  });
}
