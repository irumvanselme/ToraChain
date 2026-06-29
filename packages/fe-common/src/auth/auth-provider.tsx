"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { getSession, signOut } from "./session";
import { AuthContext, type AuthContextValue } from "./context";
import type { AuthConfig, AuthUser } from "./types";

export interface AuthProviderProps {
  /** Per-app auth wiring (better-auth API root + login URL builder). */
  config: AuthConfig;
  children: ReactNode;
}

export function AuthProvider({ config, children }: AuthProviderProps) {
  const { authApi, loginUrl } = config;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const current = await getSession(authApi);
    setUser(current);
    setLoading(false);
  }, [authApi]);

  const logout = useCallback(async () => {
    await signOut(authApi);
    setUser(null);
    // window.location.href = loginUrl(window.location.href);
  }, [authApi, loginUrl]);

  useEffect(() => {
    const controller = new AbortController();
    getSession(authApi, controller.signal)
      .then((current) => {
        setUser(current);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoading(false);
      });
    return () => controller.abort();
  }, [authApi]);

  const value: AuthContextValue = { user, loading, refresh, logout, config };
  return <AuthContext value={value}>{children}</AuthContext>;
}
