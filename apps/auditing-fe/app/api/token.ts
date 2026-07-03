"use client";

import { getTokenManager } from "@tora-chain/fe-common";

import { AUTH_API, USER_TYPE } from "../lib/config.ts";

// Shared token manager: exchanges the auditor session cookie for a JWT, caches
// it in localStorage, and refreshes it when it is missing or about to expire.
const tokens = getTokenManager({
  key: USER_TYPE,
  tokenEndpoint: `${AUTH_API}/token`,
});

/**
 * Returns a valid auditor JWT for use as a Bearer token on backend API calls,
 * refreshing from the session cookie when needed. Returns null if the session
 * is not active.
 */
export async function fetchAuditorToken(): Promise<string | null> {
  return tokens.getToken();
}
