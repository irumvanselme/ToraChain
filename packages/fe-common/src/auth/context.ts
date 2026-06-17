"use client";

import { createContext, useContext } from "react";
import type { AuthConfig, AuthState } from "./types";

/** Internal context value: session state plus the per-app config. */
export interface AuthContextValue extends AuthState {
  config: AuthConfig;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Read the session state. Throws if used outside an `<AuthProvider>`. */
export function useAuth(): AuthState {
  return useAuthContext();
}

/** Internal — exposes the config too (used by `RequireAuth`). */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
