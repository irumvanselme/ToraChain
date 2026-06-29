"use client";

import type { ReactNode } from "react";
import { AuthProvider, RequireAuth } from "@tora-chain/fe-common";
import { AUTH_API, loginUrl } from "./lib/config.ts";
import { TopNav } from "./components/top-nav";

/**
 * Client-side auth boundary. The root layout is a Server Component, so it can't
 * pass the `loginUrl` function into a Client Component directly — this wrapper
 * builds the config on the client and gates the whole app behind a session.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider config={{ authApi: AUTH_API, loginUrl }}>
      <RequireAuth>
        <TopNav />
        <main className="flex-1 flex flex-col">{children}</main>
      </RequireAuth>
    </AuthProvider>
  );
}
