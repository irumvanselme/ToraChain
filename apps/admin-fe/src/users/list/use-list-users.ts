import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listUsers,
  USER_TYPES,
  type DomainUser,
  type UserType,
} from "api/users.ts";
import type { OffsetPagination } from "api/elections.ts";

export function useListUsers() {
  const [searchParams, setSearchParams] = useSearchParams();

  const typeParam = searchParams.get("type") ?? "";
  const userType: UserType = (USER_TYPES as readonly string[]).includes(
    typeParam,
  )
    ? (typeParam as UserType)
    : "voters";
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const q = searchParams.get("q") ?? "";

  const [rows, setRows] = useState<DomainUser[]>([]);
  const [pagination, setPagination] = useState<OffsetPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local search box state, committed to the URL on submit.
  const [search, setSearch] = useState(q);

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      listUsers(userType, { page, limit: 10, q: q || undefined }, signal)
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
    [userType, page, q],
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

  return {
    userType,
    q,
    rows,
    pagination,
    loading,
    error,
    load,
    search,
    setSearch,
    patchParams,
  };
}
