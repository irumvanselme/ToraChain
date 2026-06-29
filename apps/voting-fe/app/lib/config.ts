import { apiLink, idpLink } from "@tora-chain/configs";

export const USER_TYPE = "voters" as const;
export const AUTH_BASE = `${idpLink}/${USER_TYPE}`;
export const API_BASE = apiLink;
export const AUTH_API = `${AUTH_BASE}/api`;

export function loginUrl(redirectTo: string): string {
  return `${AUTH_BASE}/login?redirect=${encodeURIComponent(redirectTo)}`;
}
