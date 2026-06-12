import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  Table,
  type Column,
} from "@tora-chain/ui-components";
import {
  deleteElection,
  listElections,
  ELECTION_STATUSES,
  type Election,
  type ElectionStatus,
  type OffsetPagination,
} from "../lib/elections.ts";
import { ApiError } from "../lib/api.ts";
import { formatDateTime, statusLabel } from "../lib/format.ts";
import { StatusBadge } from "../components/StatusBadge.tsx";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...ELECTION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
];

export function ElectionsListPage() {
  const navigate = useNavigate();
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

  const columns = useMemo<Column<Election>[]>(
    () => [
      {
        key: "title",
        header: "Title",
        cell: (row) => <span className="font-medium">{row.title}</span>,
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "startTime",
        header: "Start",
        cell: (row) => formatDateTime(row.startTime),
      },
      {
        key: "endTime",
        header: "End",
        cell: (row) => formatDateTime(row.endTime),
      },
      {
        key: "actions",
        header: "",
        className: "text-right",
        cell: (row) => (
          <div
            className="flex justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="xs"
              variant="ghost"
              onClick={() => navigate(`/elections/${row.electionId}/edit`)}
            >
              Edit
            </Button>
            <Button
              size="xs"
              variant="error"
              outline
              onClick={() => {
                setDeleteError(null);
                setToDelete(row);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Elections"
        description="Create and manage elections."
        actions={
          <Button onClick={() => navigate("/elections/new")}>
            New election
          </Button>
        }
      />

      <Card bodyClassName="gap-4">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            patchParams({ q: search.trim(), page: "" });
          }}
        >
          <div className="flex-1">
            <Input
              label="Search"
              placeholder="Search by title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              label="Status"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(e) =>
                patchParams({ status: e.target.value, page: "" })
              }
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Alert tone="error">
            <span>{error}</span>
            <Button size="sm" variant="ghost" onClick={() => load()}>
              Retry
            </Button>
          </Alert>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No elections yet"
            description="Get started by creating your first election."
            action={
              <Button onClick={() => navigate("/elections/new")}>
                New election
              </Button>
            }
          />
        ) : (
          <>
            <Table
              columns={columns}
              rows={rows}
              rowKey={(row) => row.electionId}
              onRowClick={(row) => navigate(`/elections/${row.electionId}`)}
            />
            {pagination && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-base-content/60">
                  {pagination.total} total
                </span>
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => patchParams({ page: String(p) })}
                />
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        open={toDelete !== null}
        onClose={() => !deleting && setToDelete(null)}
        title="Delete election"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => setToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="error"
              loading={deleting}
              onClick={() => void confirmDelete()}
            >
              Delete
            </Button>
          </>
        }
      >
        {deleteError && (
          <Alert tone="error" className="mb-3">
            {deleteError}
          </Alert>
        )}
        <p>
          Move <span className="font-semibold">{toDelete?.title}</span> to
          trash? Active elections cannot be deleted.
        </p>
      </Modal>
    </div>
  );
}
