import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
} from "@tora-chain/ui-components";
import {
  CalendarArrowDown,
  CalendarArrowUp,
  CheckIcon,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  ELECTION_STATUSES,
  STATUS_TRANSITIONS,
  type ElectionStatus,
} from "lib/elections";
import { formatDateTime, statusLabel } from "lib/format.ts";
import { StatusBadge } from "components/StatusBadge.tsx";
import { useListElections } from "./use-list-elections.ts";

type FilterTone =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "info"
  | "success"
  | "warning";

/** A distinct badge color per filter chip (incl. the "All" reset). */
const FILTER_TONE: Record<ElectionStatus | "", FilterTone> = {
  "": "primary",
  draft: "neutral",
  enrolling_voters: "info",
  scheduled: "accent",
  active: "success",
  ended: "secondary",
  archived: "neutral",
  paused: "warning",
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  ...ELECTION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
] as const;

export function ElectionsListPage() {
  const navigate = useNavigate();
  const {
    status: activeStatus,
    pagination,
    patchParams,
    loading,
    load,
    error,
    rows,
    toDelete,
    deleting,
    setToDelete,
    deleteError,
    setDeleteError,
    confirmDelete,
    toUpdateStatus,
    setToUpdateStatus,
    statusUpdating,
    statusUpdateError,
    setStatusUpdateError,
    confirmStatusUpdate,
  } = useListElections();

  return (
    <div className="flex flex-col gap-6 py-6">
      <PageHeader
        title="Elections"
        description="Manage elections under your institution."
        actions={
          <Button onClick={() => navigate("/elections/new")}>
            New election
          </Button>
        }
      />
      <div className={"flex flex-row flex-wrap gap-3"}>
        {STATUS_OPTIONS.map((status) => {
          const selected = activeStatus === status.value;
          return (
            <button
              key={status.value || "all"}
              id={status.value}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                patchParams({
                  // Re-selecting the active filter clears it back to "All".
                  status: selected ? "" : status.value,
                  page: "",
                })
              }
              className={`btn btn-${FILTER_TONE[status.value]} btn-sm gap-1 rounded-none cursor-pointer${
                selected ? "" : " btn-outline"
              }`}
            >
              {selected && <CheckIcon className="size-4" />}
              {status.label}
            </button>
          );
        })}
      </div>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <Card
                key={row.electionId}
                className="cursor-pointer transition-shadow hover:shadow-md"
                bodyClassName="gap-3"
                onClick={() => navigate(`/elections/${row.electionId}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{row.title}</h3>
                  <StatusBadge status={row.status} />
                </div>
                <dl className="flex flex-col gap-1.5 text-sm text-base-content/70">
                  {row.startTime ? (
                    <div className="flex items-center gap-2" title="Start">
                      <dt>
                        <CalendarArrowUp className="size-4 shrink-0 text-success" />
                        <span className="sr-only">Start</span>
                      </dt>
                      <dd>{formatDateTime(row.startTime)}</dd>
                    </div>
                  ) : (
                    <div className={"italic"}>Start time not specified</div>
                  )}
                  {row.endTime ? (
                    <div className="flex items-center gap-2" title="End">
                      <dt>
                        <CalendarArrowDown className="size-4 shrink-0 text-error" />
                        <span className="sr-only">End</span>
                      </dt>
                      <dd>{formatDateTime(row.endTime)}</dd>
                    </div>
                  ) : (
                    <div className={"italic"}>End time not specified</div>
                  )}
                </dl>
                <div
                  className="flex justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className="btn-square"
                    aria-label="Edit election"
                    title="Edit"
                    onClick={() =>
                      navigate(`/elections/${row.electionId}/edit`)
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="error"
                    outline
                    className="btn-square"
                    aria-label="Delete election"
                    title="Delete"
                    onClick={() => {
                      setDeleteError(null);
                      setToDelete(row);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  {STATUS_TRANSITIONS[row.status].length > 0 && (
                    <div className="dropdown dropdown-start dropdown-down">
                      <button
                        tabIndex={0}
                        type="button"
                        className="btn btn-ghost btn-square btn-sm"
                        aria-label="More actions"
                        title="More actions"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                      <ul
                        tabIndex={0}
                        className="dropdown-content menu bg-base-100 rounded-box z-10 w-48 p-2 shadow-lg border border-base-300"
                      >
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusUpdateError(null);
                              setToUpdateStatus(row);
                            }}
                          >
                            Update Status
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          {pagination && (
            <div className="flex items-center justify-between">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => patchParams({ page: String(p) })}
              />
            </div>
          )}
        </>
      )}

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

      <Modal
        open={toUpdateStatus !== null}
        onClose={() => !statusUpdating && setToUpdateStatus(null)}
        title="Update Status"
        actions={
          <Button
            variant="ghost"
            onClick={() => setToUpdateStatus(null)}
            disabled={statusUpdating}
          >
            Cancel
          </Button>
        }
      >
        {statusUpdateError && (
          <Alert tone="error" className="mb-3">
            {statusUpdateError}
          </Alert>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base-content/70">Current status:</span>
            {toUpdateStatus && <StatusBadge status={toUpdateStatus.status} />}
          </div>
          <p className="text-sm text-base-content/70">
            Move{" "}
            <span className="font-semibold text-base-content">
              {toUpdateStatus?.title}
            </span>{" "}
            to:
          </p>
          <div className="flex flex-wrap gap-2">
            {toUpdateStatus &&
              STATUS_TRANSITIONS[toUpdateStatus.status].map((nextStatus) => (
                <Button
                  key={nextStatus}
                  loading={statusUpdating}
                  onClick={() => void confirmStatusUpdate(nextStatus)}
                >
                  {statusLabel(nextStatus)}
                </Button>
              ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
