import { AUTH_API } from "../config.ts";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: string;
}

interface SessionResponse {
  user?: AuthUser | null;
}

/**
 * Resolve the current admin session via better-auth's `get-session`. Returns
 * the user when signed in, or `null` for any unauthenticated / error response
 * (the caller treats both the same way: send them to sign in).
 */
export async function getSession(
  signal?: AbortSignal,
): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${AUTH_API}/get-session`, {
      credentials: "include",
      headers: { accept: "application/json" },
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as SessionResponse | null;
    return data?.user ?? null;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return null;
  }
}

/** End the current session. Resolves even if the request fails. */
export async function signOut(): Promise<void> {
  try {
    await fetch(`${AUTH_API}/sign-out`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  } catch {
    // Ignore — the caller redirects to the login page regardless.
  }
}
