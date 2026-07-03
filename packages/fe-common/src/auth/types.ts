export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: string;
}

/**
 * Per-app wiring the auth components need. Each identity domain (voters,
 * admins, auditors) lives behind its own auth-service base path, so the
 * consuming app supplies these rather than the package hard-coding them.
 */
export interface AuthConfig {
  /** better-auth API root for this domain, e.g. `${AUTH_BASE}/api`. */
  authApi: string;
  /** Build the sign-in URL carrying a `redirect` back to `redirectTo`. */
  loginUrl: (redirectTo: string) => string;
  /**
   * Token-manager key for this domain (the user type). When set, `logout`
   * also clears the cached backend JWT so the next session starts clean.
   */
  tokenKey?: string;
  /**
   * Endpoint that exchanges the session cookie for a backend JWT, e.g.
   * `${AUTH_BASE}/api/token`. When set together with `tokenKey`, the provider
   * fetches (and caches) the token as soon as the session resolves and exposes
   * `tokenReady`, so gated content can wait for it before hitting the backend.
   */
  tokenEndpoint?: string;
}

export interface AuthState {
  user: AuthUser | null;
  /** True until the initial session check resolves. */
  loading: boolean;
  /**
   * True once the backend JWT has been fetched for the current session (or when
   * no token is configured). Gated content should wait for this before calling
   * the backend so no request goes out without a `Bearer` token.
   */
  tokenReady: boolean;
  /** Re-check the session (e.g. after returning from sign-in). */
  refresh: () => Promise<void>;
  /** Sign out and send the user back to the login page. */
  logout: () => Promise<void>;
}
