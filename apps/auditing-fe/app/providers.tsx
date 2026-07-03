"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, RequireAuth } from "@tora-chain/fe-common";
import {
  AUTH_API,
  USER_TYPE,
  loginUrl,
  ONBOARDING_URL,
  PENDING_URL,
} from "./lib/config.ts";
import { AuditProvider, useAudit } from "./lib/audit-context";
import { AppNav } from "./components/app-nav";

/** Redirects to onboarding or pending based on org approval status. */
function OrgGate({ children }: { children: ReactNode }) {
  const { auditStatus, loading } = useAudit();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!auditStatus) return;

    const org = auditStatus.org;

    if (!org) {
      // Not yet onboarded — redirect to auth service onboarding page
      window.location.href = ONBOARDING_URL;
      return;
    }

    if (org.approvalStatus === "pending" || org.approvalStatus === "rejected") {
      // Not yet approved — redirect to the auth-service pending status page.
      // This page lives on the auth service (external), never in this app, so
      // always redirect regardless of the current path.
      window.location.href = PENDING_URL;
      return;
    }

    // Approved: the only in-app landing page is "/", so send them onward.
    if (pathname === "/") {
      router.replace("/dashboard");
    }
  }, [loading, auditStatus, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <>
      <AppNav />
      {children}
    </>
  );
}

/**
 * Client-side provider stack. The root layout is a Server Component so it
 * delegates auth + org gating here.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider config={{ authApi: AUTH_API, loginUrl, tokenKey: USER_TYPE }}>
      <RequireAuth>
        <AuditProvider>
          <OrgGate>{children}</OrgGate>
        </AuditProvider>
      </RequireAuth>
    </AuthProvider>
  );
}
