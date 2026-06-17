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
}

export interface AuthState {
  user: AuthUser | null;
  /** True until the initial session check resolves. */
  loading: boolean;
  /** Re-check the session (e.g. after returning from sign-in). */
  refresh: () => Promise<void>;
  /** Sign out and send the user back to the login page. */
  logout: () => Promise<void>;
}
