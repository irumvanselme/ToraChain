import { idpLink, apiLink } from "@tora-chain/configs";

export const USER_TYPE = "admins" as const;
export const AUTH_BASE = `${idpLink}/${USER_TYPE}`;
export const API_BASE = apiLink;
export const AUTH_API = `${AUTH_BASE}/api`;
export const CORE_API = `${idpLink}/core/api`;

export function loginUrl(redirectTo: string): string {
  return `${AUTH_BASE}/login?redirect=${encodeURIComponent(redirectTo)}`;
}
