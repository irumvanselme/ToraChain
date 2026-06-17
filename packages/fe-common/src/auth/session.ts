import type { AuthUser } from "./types";

interface SessionResponse {
  user?: AuthUser | null;
}

/**
 * Resolve the current session via better-auth's `get-session`. Returns the user
 * when signed in, or `null` for any unauthenticated / error response (the
 * caller treats both the same way: send them to sign in).
 */
export async function getSession(
  authApi: string,
  signal?: AbortSignal,
): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${authApi}/get-session`, {
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
export async function signOut(authApi: string): Promise<void> {
  try {
    await fetch(`${authApi}/sign-out`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  } catch {
    // Ignore — the caller redirects to the login page regardless.
  }
}
