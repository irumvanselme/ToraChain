"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSession, signOut } from "./session";
import { clearStoredToken, getTokenManager } from "../token/manager";
import { AuthContext, type AuthContextValue } from "./context";
import type { AuthConfig, AuthUser } from "./types";

export interface AuthProviderProps {
  /** Per-app auth wiring (better-auth API root + login URL builder). */
  config: AuthConfig;
  children: ReactNode;
}

/** How many times to retry the token exchange right after a session resolves. */
const TOKEN_ATTEMPTS = 3;
/** Delay between token-exchange retries (ms). */
const TOKEN_RETRY_DELAY = 300;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ config, children }: AuthProviderProps) {
  const { authApi, loginUrl, tokenKey, tokenEndpoint } = config;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // The token manager exchanges the session cookie for a backend JWT. When it
  // isn't configured there is nothing to wait for, so `tokenReady` starts true.
  const tokens = useMemo(
    () =>
      tokenKey && tokenEndpoint
        ? getTokenManager({ key: tokenKey, tokenEndpoint })
        : null,
    [tokenKey, tokenEndpoint],
  );
  const [tokenReady, setTokenReady] = useState(!tokens);

  const refresh = useCallback(async () => {
    const current = await getSession(authApi);
    setUser(current);
    setLoading(false);
  }, [authApi]);

  const logout = useCallback(async () => {
    await signOut(authApi);
    if (tokenKey) clearStoredToken(tokenKey);
    setUser(null);
    setTokenReady(!tokens);
    // window.location.href = loginUrl(window.location.href);
  }, [authApi, loginUrl, tokenKey, tokens]);

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

  // Once we know there is a session, pre-fetch the backend JWT so gated content
  // never fires a request before the token is cached. Right after sign-in the
  // /token exchange can transiently fail (the session cookie may not be honored
  // on the first try), so retry a few times before giving up.
  useEffect(() => {
    if (!tokens) return;
    if (loading) return;
    if (!user) {
      setTokenReady(false);
      return;
    }

    let cancelled = false;
    setTokenReady(false);

    (async () => {
      for (let attempt = 0; attempt < TOKEN_ATTEMPTS && !cancelled; attempt++) {
        const token = await tokens.getToken();
        if (cancelled) return;
        if (token) break;
        if (attempt < TOKEN_ATTEMPTS - 1) await wait(TOKEN_RETRY_DELAY);
      }
      // Mark ready even if the exchange never succeeded: the per-request 401
      // retry is the last-resort fallback, and we must not hang the UI forever.
      if (!cancelled) setTokenReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [tokens, loading, user]);

  const value: AuthContextValue = {
    user,
    loading,
    tokenReady,
    refresh,
    logout,
    config,
  };
  return <AuthContext value={value}>{children}</AuthContext>;
}
