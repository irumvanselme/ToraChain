import { apiLink, idpLink } from "@tora-chain/configs";

export const USER_TYPE = "auditors" as const;
export const AUTH_BASE = `${idpLink}/${USER_TYPE}`;
export const API_BASE = apiLink;
export const ONBOARDING_URL = `${AUTH_BASE}/onboarding`;
export const PENDING_URL = `${AUTH_BASE}/pending`;
export const AUDIT_API = `${API_BASE}/audit`;

export const AUTH_API = `${AUTH_BASE}/api`;

export function loginUrl(redirectTo: string): string {
  return `${AUTH_BASE}/login?redirect=${encodeURIComponent(redirectTo)}`;
}
