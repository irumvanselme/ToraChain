import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, PageHeader } from "@tora-chain/ui-components";
import { createElection, type ElectionInput } from "../lib/elections.ts";
import { ApiError } from "../lib/api.ts";
import { ElectionForm } from "../components/ElectionForm.tsx";

export function ElectionCreatePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: ElectionInput) {
    setSubmitting(true);
    setError(null);
    try {
      const created = await createElection(input);
      navigate(`/elections/${created.electionId}`, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not create the election.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New election" />
      <Card>
        <ElectionForm
          submitLabel="Create election"
          submitting={submitting}
          error={error}
          onSubmit={(input) => void handleSubmit(input)}
          onCancel={() => navigate("/elections")}
        />
      </Card>
    </div>
  );
}
