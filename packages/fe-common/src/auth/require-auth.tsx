"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthContext } from "./context";

export interface RequireAuthProps {
  children: ReactNode;
  /**
   * Rendered while the session check is in flight or a redirect is pending.
   * Defaults to a centered spinner; pass your own to match the app's design
   * system (e.g. the shared `<Spinner>`).
   */
  fallback?: ReactNode;
}

/**
 * Gate for authenticated content. While the session check is in flight — or the
 * backend JWT is still being fetched for a confirmed session — it shows the
 * `fallback`; if there is no session it redirects the browser to the auth
 * service's sign-in page with a `redirect` back to the current location.
 *
 * Holding the fallback until `tokenReady` ensures children (which call the
 * backend on mount) never fire a request before the token is cached.
 */
export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { user, loading, tokenReady, config } = useAuthContext();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = config.loginUrl(window.location.href);
    }
  }, [loading, user, config]);

  if (loading || !user || !tokenReady) {
    return fallback ?? <DefaultFallback />;
  }

  return <>{children}</>;
}

function DefaultFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
    >
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      <span className="sr-only">Checking your session</span>
    </div>
  );
}
