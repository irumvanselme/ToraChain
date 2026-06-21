import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Spinner,
  Table,
  type Column,
} from "@tora-chain/ui-components";
import { Trash2 } from "lucide-react";
import { ApiError } from "lib/api.ts";
import {
  grantVoter,
  listVoters,
  revokeVoter,
  type Eligibility,
} from "lib/voters.ts";

const PAGE_SIZE = 20;

export function ElectionVotersTable({ electionId }: { electionId: string }) {
  const [rows, setRows] = useState<Eligibility[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [granting, setGranting] = useState(false);
  const [toRevoke, setToRevoke] = useState<Eligibility | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Initial load (and reload after a mutation). Replaces the whole list.
  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      listVoters(electionId, { limit: PAGE_SIZE }, signal)
        .then((res) => {
          setRows(res.data);
          setNextCursor(res.pagination.nextCursor);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(
            err instanceof ApiError ? err.message : "Failed to load voters.",
          );
          setLoading(false);
        });
    },
    [electionId],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await listVoters(electionId, {
        limit: PAGE_SIZE,
        cursor: nextCursor,
      });
      setRows((prev) => [...prev, ...res.data]);
      setNextCursor(res.pagination.nextCursor);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load more voters.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function confirmRevoke() {
    if (!toRevoke) return;
    setRevoking(true);
    setRevokeError(null);
    try {
      await revokeVoter(electionId, toRevoke.voterId);
      setToRevoke(null);
      load();
    } catch (err) {
      setRevokeError(
        err instanceof ApiError ? err.message : "Could not revoke eligibility.",
      );
    } finally {
      setRevoking(false);
    }
  }

  const columns: Column<Eligibility>[] = [
    {
      key: "voterId",
      header: "Voter",
      cell: (v) => <span className="font-mono text-xs">{v.voterId}</span>,
    },
    {
      key: "hasVoted",
      header: "Voted",
      cell: (v) =>
        v.hasVoted ? (
          <Badge tone="success">Voted</Badge>
        ) : (
          <Badge tone="ghost">Not yet</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (v) => (
        <Button
          size="sm"
          variant="error"
          outline
          className="btn-square"
          aria-label="Revoke eligibility"
          title="Revoke"
          disabled={v.hasVoted}
          onClick={() => {
            setRevokeError(null);
            setToRevoke(v);
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-base-content/60">Eligible voters</p>
        <Button size="sm" onClick={() => setGranting(true)}>
          Add voter
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
          title="No eligible voters yet"
          description="Grant voters eligibility so they can cast a ballot."
          action={<Button onClick={() => setGranting(true)}>Add voter</Button>}
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={rows}
            rowKey={(v) => v.eligibilityId}
          />
          {nextCursor && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                loading={loadingMore}
                onClick={() => void loadMore()}
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      <GrantVoterModal
        electionId={electionId}
        open={granting}
        onClose={() => setGranting(false)}
        onGranted={() => {
          setGranting(false);
          load();
        }}
      />

      <Modal
        open={toRevoke !== null}
        onClose={() => !revoking && setToRevoke(null)}
        title="Revoke eligibility"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => setToRevoke(null)}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              variant="error"
              loading={revoking}
              onClick={() => void confirmRevoke()}
            >
              Revoke
            </Button>
          </>
        }
      >
        {revokeError && (
          <Alert tone="error" className="mb-3">
            {revokeError}
          </Alert>
        )}
        <p>Revoke this voter's eligibility for the election?</p>
      </Modal>
    </div>
  );
}

interface GrantVoterModalProps {
  electionId: string;
  open: boolean;
  onClose: () => void;
  onGranted: () => void;
}

function GrantVoterModal({
  electionId,
  open,
  onClose,
  onGranted,
}: GrantVoterModalProps) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setEmailError(null);
    setError(null);
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setEmailError(null);
    setError(null);

    const value = email.trim();
    if (!value) {
      setEmailError("Email is required.");
      return;
    }

    setSubmitting(true);
    try {
      await grantVoter(electionId, { email: value });
      onGranted();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not grant eligibility.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title="Add voter"
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Input
          label="Voter email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
          hint="The voter is matched against the auth directory."
          placeholder="voter@example.com"
          required
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
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}
