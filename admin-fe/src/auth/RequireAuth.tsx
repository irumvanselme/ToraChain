import { useEffect, type ReactNode } from "react";
import { Spinner } from "@tora-chain/ui-components";
import { loginUrl } from "../config.ts";
import { useAuth } from "./context.ts";

/**
 * Gate for authenticated routes. While the session check is in flight it shows
 * a spinner; if there is no session it redirects the browser to the auth
 * service's sign-in page with a `redirect` back to the current location.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = loginUrl(window.location.href);
    }
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" label="Checking your session" />
      </div>
    );
  }

  return <>{children}</>;
}
