import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  PageHeader,
  Spinner,
} from "@tora-chain/ui-components";
import { ApiError } from "lib/api.ts";
import { formatDateTime } from "lib/format.ts";
import { StatusBadge } from "components/StatusBadge.tsx";
import { getElection, type Election } from "lib/elections.ts";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
        {label}
      </span>
      <span className="text-base">{children}</span>
    </div>
  );
}

export function ElectionDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getElection(id, controller.signal)
      .then((found) => {
        setElection(found);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError ? err.message : "Could not load election.",
        );
        setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <PageHeader
        title={election?.title ?? "Election"}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate("/elections")}>
              Back
            </Button>
            {election && (
              <Button
                onClick={() =>
                  navigate(`/elections/${election.electionId}/edit`)
                }
              >
                Edit
              </Button>
            )}
          </>
        }
      />

      <Card>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error || !election ? (
          <Alert tone="error">{error ?? "Election not found."}</Alert>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Status">
              <StatusBadge status={election.status} />
            </Field>
            <Field label="Election ID">
              <span className="font-mono text-sm">{election.electionId}</span>
            </Field>
            <Field label="Start time">
              {formatDateTime(election.startTime)}
            </Field>
            <Field label="End time">{formatDateTime(election.endTime)}</Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                {election.description || (
                  <span className="text-base-content/50">No description</span>
                )}
              </Field>
            </div>
            {election.deleted && (
              <div className="sm:col-span-2">
                <Badge tone="error">In trash</Badge>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
