import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  deleteElection,
  listElections,
  updateElectionStatus,
  type Election,
  type ElectionStatus,
  type OffsetPagination,
} from "api/elections.ts";
import { ApiError } from "api/error";

export function useListElections() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const status = (searchParams.get("status") ?? "") as ElectionStatus | "";
  const q = searchParams.get("q") ?? "";

  const [rows, setRows] = useState<Election[]>([]);
  const [pagination, setPagination] = useState<OffsetPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local search box state, committed to the URL on submit.
  const [search, setSearch] = useState(q);
  const [toDelete, setToDelete] = useState<Election | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [toUpdateStatus, setToUpdateStatus] = useState<Election | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(
    null,
  );

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      listElections(
        {
          page,
          limit: 10,
          status: status || undefined,
          q: q || undefined,
        },
        signal,
      )
        .then((res) => {
          setRows(res.data);
          setPagination(res.pagination);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Failed to load.");
          setLoading(false);
        });
    },
    [page, status, q],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    setSearch(q);
  }, [q]);

  const patchParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    setSearchParams(params);
  };

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteElection(toDelete.electionId);
      setToDelete(null);
      load();
    } catch (err) {
      setDeleteError(
        err instanceof ApiError
          ? err.message
          : "Could not delete this election.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function confirmStatusUpdate(newStatus: ElectionStatus) {
    if (!toUpdateStatus) return;
    setStatusUpdating(true);
    setStatusUpdateError(null);
    try {
      await updateElectionStatus(toUpdateStatus.electionId, newStatus);
      setToUpdateStatus(null);
      load();
    } catch (err) {
      setStatusUpdateError(
        err instanceof ApiError
          ? err.message
          : "Could not update the election status.",
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  return {
    rows,
    status,
    pagination,
    patchParams,
    deleteError,
    confirmDelete,
    loading,
    load,
    setDeleteError,
    error,
    search,
    setSearch,
    toDelete,
    setToDelete,
    deleting,
    toUpdateStatus,
    setToUpdateStatus,
    statusUpdating,
    statusUpdateError,
    setStatusUpdateError,
    confirmStatusUpdate,
  };
}
