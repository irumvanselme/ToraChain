"use client";

import { AUTH_API } from "../config";

/**
 * Exchanges the current session cookie for a short-lived JWT.
 * The JWT is then used as a Bearer token for backend API calls.
 * Returns null if the session is not active.
 */
export async function fetchAuditorToken(): Promise<string | null> {
  try {
    const res = await fetch(`${AUTH_API}/token`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}
