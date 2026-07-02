import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  approveAuditOrg,
  listAuditOrgs,
  rejectAuditOrg,
  type ApprovalStatus,
  type AuditOrgListItem,
} from "api/audit-orgs.ts";
import { ApiError } from "api/error";

export type ApprovalFilter = ApprovalStatus | "all";

export function usePendingApprovals() {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get("filter");
  const filter: ApprovalFilter =
    raw === "approved" || raw === "rejected" || raw === "all" ? raw : "pending";

  const [rows, setRows] = useState<AuditOrgListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [toApprove, setToApprove] = useState<AuditOrgListItem | null>(null);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const [toReject, setToReject] = useState<AuditOrgListItem | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      listAuditOrgs(filter === "all" ? undefined : filter, signal)
        .then((res) => {
          setRows(res);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Failed to load.");
          setLoading(false);
        });
    },
    [filter],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const setFilter = (next: ApprovalFilter) => {
    const params = new URLSearchParams(searchParams);
    // "pending" is the default view, so keep the URL clean for it.
    if (next === "pending") params.delete("filter");
    else params.set("filter", next);
    setSearchParams(params);
  };

  async function confirmApprove() {
    if (!toApprove) return;
    setApproving(true);
    setApproveError(null);
    try {
      await approveAuditOrg(toApprove.orgId);
      setToApprove(null);
      load();
    } catch (err) {
      setApproveError(
        err instanceof ApiError
          ? err.message
          : "Could not approve this organization.",
      );
    } finally {
      setApproving(false);
    }
  }

  async function confirmReject(reason: string) {
    if (!toReject) return;
    setRejecting(true);
    setRejectError(null);
    try {
      await rejectAuditOrg(toReject.orgId, reason);
      setToReject(null);
      load();
    } catch (err) {
      setRejectError(
        err instanceof ApiError
          ? err.message
          : "Could not reject this organization.",
      );
    } finally {
      setRejecting(false);
    }
  }

  return {
    filter,
    setFilter,
    rows,
    loading,
    load,
    error,
    toApprove,
    setToApprove,
    approving,
    approveError,
    setApproveError,
    confirmApprove,
    toReject,
    setToReject,
    rejecting,
    rejectError,
    setRejectError,
    confirmReject,
  };
}
