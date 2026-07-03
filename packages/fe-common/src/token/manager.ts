/**
 * Framework-agnostic manager for the short-lived JWTs the backend APIs require.
 *
 * Each identity domain (voters/admins/auditors) mints its own token by
 * exchanging the session cookie at the auth service's `/token` endpoint. This
 * util caches that token in `localStorage`, refreshes it (from the session
 * cookie) when it is missing or about to expire, and attaches it as a
 * `Bearer` token to outgoing requests.
 *
 * It carries no React/Next dependency so every frontend can share it.
 */

export interface TokenManagerConfig {
  /**
   * Stable key identifying this domain's token in storage — pass the user type
   * (`"admins"`, `"voters"`, `"auditors"`). Managers are cached per key.
   */
  key: string;
  /**
   * URL that exchanges the current session cookie for a JWT via `GET`, e.g.
   * `${AUTH_BASE}/api/token`. Called with `credentials: "include"`.
   */
  tokenEndpoint: string;
  /** Refresh this many seconds before the token's `exp`. Defaults to 30. */
  refreshSkewSeconds?: number;
}

export interface TokenManager {
  /** A valid token, refreshing if missing/expired. `null` when unauthenticated. */
  getToken(): Promise<string | null>;
  /** Force a refresh from the session cookie. `null` when unauthenticated. */
  refresh(): Promise<string | null>;
  /** Synchronously read the cached token without validating it. */
  peek(): string | null;
  /** Drop the cached token (e.g. on sign-out). */
  clear(): void;
  /**
   * `fetch` with the bearer token attached. If the response is `401` and a
   * token was sent, refreshes once and retries.
   */
  authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

const STORAGE_PREFIX = "tora-chain.jwt.";

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

/** Best-effort access to `localStorage` (absent during SSR / when blocked). */
function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredToken(key: string): string | null {
  return storage()?.getItem(storageKey(key)) ?? null;
}

export function clearStoredToken(key: string): void {
  storage()?.removeItem(storageKey(key));
}

function writeStoredToken(key: string, token: string): void {
  storage()?.setItem(storageKey(key), token);
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  // `atob` is available in browsers and Node 16+; callers guard with try/catch.
  return atob(padded);
}

/** The `exp` claim (unix seconds) of a JWT, or null if undecodable. */
function tokenExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    return typeof claims.exp === "number" ? claims.exp : null;
  } catch {
    return null;
  }
}

function isExpired(token: string, skewSeconds: number): boolean {
  const exp = tokenExpiry(token);
  // Treat an undecodable/exp-less token as expired so we refresh it.
  if (exp === null) return true;
  return Date.now() / 1000 >= exp - skewSeconds;
}

async function fetchFreshToken(endpoint: string): Promise<string | null> {
  try {
    const res = await fetch(endpoint, {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as {
      token?: string;
    } | null;
    return data?.token ?? null;
  } catch {
    return null;
  }
}

export function createTokenManager(config: TokenManagerConfig): TokenManager {
  const { key, tokenEndpoint } = config;
  const skew = config.refreshSkewSeconds ?? 30;

  // De-dupe concurrent refreshes so a burst of API calls triggers one exchange.
  let inflight: Promise<string | null> | null = null;

  function refresh(): Promise<string | null> {
    if (!inflight) {
      inflight = fetchFreshToken(tokenEndpoint)
        .then((token) => {
          if (token) writeStoredToken(key, token);
          else clearStoredToken(key);
          return token;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  }

  async function getToken(): Promise<string | null> {
    const stored = readStoredToken(key);
    if (stored && !isExpired(stored, skew)) return stored;
    return refresh();
  }

  async function authFetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
  ): Promise<Response> {
    const send = (token: string | null): Promise<Response> => {
      const headers = new Headers(init.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    };

    const token = await getToken();
    const res = await send(token);
    if (res.status !== 401 || !token) return res;

    // The token was rejected (likely just expired) — refresh once and retry.
    const refreshed = await refresh();
    return refreshed ? send(refreshed) : res;
  }

  return {
    getToken,
    refresh,
    peek: () => readStoredToken(key),
    clear: () => clearStoredToken(key),
    authFetch,
  };
}

const managers = new Map<string, TokenManager>();

/**
 * Returns a process-wide cached {@link TokenManager} for `config.key`, so every
 * caller in an app shares one token cache and one in-flight refresh.
 */
export function getTokenManager(config: TokenManagerConfig): TokenManager {
  let manager = managers.get(config.key);
  if (!manager) {
    manager = createTokenManager(config);
    managers.set(config.key, manager);
  }
  return manager;
}
