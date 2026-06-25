"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAudit } from "./lib/audit-context";

export default function RootPage() {
  const { auditStatus, loading } = useAudit();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (auditStatus?.org?.approvalStatus === "approved") {
      router.replace("/dashboard");
    }
  }, [loading, auditStatus, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500 text-sm">Redirecting…</div>
    </div>
  );
}
