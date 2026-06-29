"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, RequireAuth } from "@tora-chain/fe-common";
import {
  AUTH_API,
  loginUrl,
  ONBOARDING_URL,
  PENDING_URL,
} from "./lib/config.ts";
import { AuditProvider, useAudit } from "./lib/audit-context";

/** Redirects to onboarding or pending based on org approval status. */
function OrgGate({ children }: { children: ReactNode }) {
  const { auditStatus, loading } = useAudit();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isDashboardPath =
      !pathname.startsWith("/onboarding") &&
      !pathname.startsWith("/pending") &&
      pathname !== "/";

    if (!auditStatus) return;

    const org = auditStatus.org;

    if (!org) {
      // Not yet onboarded — redirect to auth service onboarding page
      window.location.href = ONBOARDING_URL;
      return;
    }

    if (org.approvalStatus === "pending" || org.approvalStatus === "rejected") {
      // Not yet approved — redirect to pending status page
      if (isDashboardPath) {
        window.location.href = PENDING_URL;
      }
      return;
    }

    // Approved: if on a non-dashboard path, send them to the dashboard
    if (
      pathname === "/" ||
      pathname === "/pending" ||
      pathname === "/onboarding"
    ) {
      router.push("/dashboard");
    }
  }, [loading, auditStatus, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Client-side provider stack. The root layout is a Server Component so it
 * delegates auth + org gating here.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider config={{ authApi: AUTH_API, loginUrl }}>
      <RequireAuth>
        <AuditProvider>
          <OrgGate>{children}</OrgGate>
        </AuditProvider>
      </RequireAuth>
    </AuthProvider>
  );
}
