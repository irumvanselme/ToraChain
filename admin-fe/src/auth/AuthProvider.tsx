import { useCallback, useEffect, useState, type ReactNode } from "react";
import { loginUrl } from "../config.ts";
import { getSession, signOut, type AuthUser } from "../lib/auth.ts";
import { AuthContext, type AuthState } from "./context.ts";

/** Send the browser to the server-rendered sign-in page, preserving the full URL. */
function redirectToLogin(): void {
  window.location.href = loginUrl(window.location.href);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const current = await getSession();
    setUser(current);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    redirectToLogin();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getSession(controller.signal)
      .then((current) => {
        setUser(current);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const value: AuthState = { user, loading, refresh, logout };
  return <AuthContext value={value}>{children}</AuthContext>;
}
