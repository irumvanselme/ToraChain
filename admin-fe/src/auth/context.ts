import { createContext, useContext } from "react";
import type { AuthUser } from "../lib/auth.ts";

export interface AuthState {
  user: AuthUser | null;
  /** True until the initial session check resolves. */
  loading: boolean;
  /** Re-check the session (e.g. after returning from sign-in). */
  refresh: () => Promise<void>;
  /** Sign out and send the admin back to the login page. */
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
