import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Card, PageHeader, Spinner } from "@tora-chain/ui-components";
import {
  getElection,
  updateElection,
  type Election,
  type ElectionInput,
} from "lib/elections.ts";
import { ApiError } from "lib/api.ts";
import { ElectionForm } from "components/ElectionForm.tsx";

export function ElectionEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    getElection(id, controller.signal)
      .then((found) => {
        setElection(found);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(
          err instanceof ApiError ? err.message : "Could not load election.",
        );
        setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  async function handleSubmit(input: ElectionInput) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateElection(id, input);
      navigate(`/elections/${id}`, { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Could not save changes.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <PageHeader title="Edit election" />
      <Card>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : loadError || !election ? (
          <Alert tone="error">{loadError ?? "Election not found."}</Alert>
        ) : (
          <ElectionForm
            initial={election}
            submitLabel="Save changes"
            submitting={submitting}
            error={submitError}
            onSubmit={(input) => void handleSubmit(input)}
            onCancel={() => navigate(`/elections/${id}`)}
          />
        )}
      </Card>
    </div>
  );
}
