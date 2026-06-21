import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Spinner,
  Table,
  Textarea,
  type Column,
} from "@tora-chain/ui-components";
import { Pencil, Trash2 } from "lucide-react";
import { ApiError } from "lib/api.ts";
import {
  createCandidate,
  deleteCandidate,
  listCandidates,
  updateCandidate,
  type Candidate,
  type CandidateInput,
} from "lib/candidates.ts";
import type { OffsetPagination } from "lib/elections.ts";

const PAGE_SIZE = 10;

interface FormState {
  open: boolean;
  editing: Candidate | null;
}

export function ElectionCandidatesTable({
  electionId,
}: {
  electionId: string;
}) {
  const [rows, setRows] = useState<Candidate[]>([]);
  const [pagination, setPagination] = useState<OffsetPagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({ open: false, editing: null });
  const [toDelete, setToDelete] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      listCandidates(electionId, { page, limit: PAGE_SIZE }, signal)
        .then((res) => {
          setRows(res.data);
          setPagination(res.pagination);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load candidates.",
          );
          setLoading(false);
        });
    },
    [electionId, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCandidate(electionId, toDelete.candidateId);
      setToDelete(null);
      load();
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : "Could not delete candidate.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Candidate>[] = [
    {
      key: "fullName",
      header: "Name",
      cell: (c) => <span className="font-medium">{c.fullName}</span>,
    },
    {
      key: "manifesto",
      header: "Manifesto",
      cell: (c) =>
        c.manifesto ? (
          <span className="line-clamp-2 text-sm text-base-content/70">
            {c.manifesto}
          </span>
        ) : (
          <span className="text-base-content/40">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="btn-square"
            aria-label="Edit candidate"
            title="Edit"
            onClick={() => setForm({ open: true, editing: c })}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="error"
            outline
            className="btn-square"
            aria-label="Delete candidate"
            title="Delete"
            onClick={() => {
              setDeleteError(null);
              setToDelete(c);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-base-content/60">
          {pagination ? `${pagination.total} candidate(s)` : "Candidates"}
        </p>
        <Button
          size="sm"
          onClick={() => setForm({ open: true, editing: null })}
        >
          Add candidate
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
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
          title="No candidates yet"
          description="Add the people standing in this election."
          action={
            <Button onClick={() => setForm({ open: true, editing: null })}>
              Add candidate
            </Button>
          }
        />
      ) : (
        <>
          <Table columns={columns} rows={rows} rowKey={(c) => c.candidateId} />
          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <CandidateFormModal
        electionId={electionId}
        open={form.open}
        editing={form.editing}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSaved={() => {
          setForm({ open: false, editing: null });
          load();
        }}
      />

      <Modal
        open={toDelete !== null}
        onClose={() => !deleting && setToDelete(null)}
        title="Delete candidate"
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
          Remove <span className="font-semibold">{toDelete?.fullName}</span>{" "}
          from this election? Candidates are locked once voting opens.
        </p>
      </Modal>
    </div>
  );
}

interface CandidateFormModalProps {
  electionId: string;
  open: boolean;
  editing: Candidate | null;
  onClose: () => void;
  onSaved: () => void;
}

function CandidateFormModal({
  electionId,
  open,
  editing,
  onClose,
  onSaved,
}: CandidateFormModalProps) {
  const [fullName, setFullName] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the fields whenever the modal opens (for add) or targets a candidate.
  useEffect(() => {
    if (!open) return;
    setFullName(editing?.fullName ?? "");
    setManifesto(editing?.manifesto ?? "");
    setNameError(null);
    setError(null);
  }, [open, editing]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setNameError(null);
    setError(null);

    const name = fullName.trim();
    if (!name) {
      setNameError("Name is required.");
      return;
    }

    const input: CandidateInput = {
      fullName: name,
      manifesto: manifesto.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updateCandidate(electionId, editing.candidateId, input);
      } else {
        await createCandidate(electionId, input);
      }
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save candidate.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={editing ? "Edit candidate" : "Add candidate"}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Input
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={nameError}
          placeholder="e.g. Jane Doe"
          required
        />
        <Textarea
          label="Manifesto"
          value={manifesto}
          onChange={(e) => setManifesto(e.target.value)}
          rows={4}
          placeholder="Optional statement or platform"
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {editing ? "Save" : "Add"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
