"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@tora-chain/fe-common";
import { AUTH_API, USER_TYPE, loginUrl } from "./lib/config.ts";

/**
 * App-wide auth context. The root layout is a Server Component, so it can't
 * build the `loginUrl` function itself — this wrapper constructs the config on
 * the client and makes the session available to the whole tree, including the
 * public landing page (which shows "Sign in" vs "View elections" based on it).
 *
 * Route gating lives in `app/elections/layout.tsx`, NOT here, so `/` stays
 * publicly accessible.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider
      config={{
        authApi: AUTH_API,
        loginUrl,
        tokenKey: USER_TYPE,
        tokenEndpoint: `${AUTH_API}/token`,
      }}
    >
      {children}
    </AuthProvider>
  );
}
