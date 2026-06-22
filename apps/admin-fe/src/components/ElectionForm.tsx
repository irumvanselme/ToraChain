import { useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Input,
  Select,
  Textarea,
} from "@tora-chain/ui-components";
import {
  ELECTION_STATUSES,
  type ElectionInput,
  type ElectionStatus,
} from "../lib/elections.ts";
import {
  isoToLocalInput,
  localInputToIso,
  statusLabel,
} from "../lib/format.ts";

interface FieldState {
  title: string;
  description: string;
  status: ElectionStatus;
  startTime: string; // datetime-local value
  endTime: string; // datetime-local value
}

function toFieldState(initial?: Partial<ElectionInput>): FieldState {
  return {
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "draft",
    startTime: isoToLocalInput(initial?.startTime ?? null),
    endTime: isoToLocalInput(initial?.endTime ?? null),
  };
}

const STATUS_OPTIONS = ELECTION_STATUSES.map((status) => ({
  value: status,
  label: statusLabel(status),
}));

export interface ElectionFormProps {
  initial?: Partial<ElectionInput>;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: ElectionInput) => void;
  onCancel: () => void;
}

export function ElectionForm({
  initial,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onCancel,
}: ElectionFormProps) {
  const [fields, setFields] = useState<FieldState>(() => toFieldState(initial));
  const [titleError, setTitleError] = useState<string | null>(null);
  const [windowError, setWindowError] = useState<string | null>(null);

  const set =
    <K extends keyof FieldState>(key: K) =>
    (value: FieldState[K]) =>
      setFields((prev) => ({ ...prev, [key]: value }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTitleError(null);
    setWindowError(null);

    const title = fields.title.trim();
    if (!title) {
      setTitleError("Title is required.");
      return;
    }

    const startTime = localInputToIso(fields.startTime);
    const endTime = localInputToIso(fields.endTime);
    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
      setWindowError("End time must be after the start time.");
      return;
    }

    onSubmit({
      title,
      description: fields.description.trim() || null,
      status: fields.status,
      startTime,
      endTime,
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {error && <Alert tone="error">{error}</Alert>}

      <Input
        label="Title"
        value={fields.title}
        onChange={(e) => set("title")(e.target.value)}
        error={titleError}
        placeholder="e.g. Student Council 2026"
        required
      />

      <Textarea
        label="Description"
        value={fields.description}
        onChange={(e) => set("description")(e.target.value)}
        rows={4}
        placeholder="Optional details about this election"
      />

      <Select
        label="Status"
        value={fields.status}
        onChange={(e) => set("status")(e.target.value as ElectionStatus)}
        options={STATUS_OPTIONS}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Start time"
          type="datetime-local"
          value={fields.startTime}
          onChange={(e) => set("startTime")(e.target.value)}
        />
        <Input
          label="End time"
          type="datetime-local"
          value={fields.endTime}
          onChange={(e) => set("endTime")(e.target.value)}
          error={windowError}
        />
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
