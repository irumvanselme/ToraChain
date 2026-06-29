import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Spinner,
} from "@tora-chain/ui-components";
import { ApiError } from "api/error";
import {
  getIntegration,
  upsertIntegration,
  deleteIntegration,
  type FormField,
  type HttpApiConfig,
  type Integration,
} from "api/integrations";
import { ChevronLeft } from "lucide-react";

// ---- Integration type catalogue ------------------------------------------

interface IntegrationTypeDef {
  value: string;
  label: string;
  description: string;
  available: boolean;
}

const INTEGRATION_TYPES: IntegrationTypeDef[] = [
  {
    value: "http_api",
    label: "HTTP API",
    description:
      "Call an external eligibility endpoint. The backend forwards voter form data and expects a 200 response when eligible.",
    available: true,
  },
  {
    value: "web3",
    label: "Web3 / Smart Contract",
    description: "Verify eligibility against an on-chain contract.",
    available: false,
  },
  {
    value: "csv",
    label: "CSV Upload",
    description: "Upload a voter list as a CSV file.",
    available: false,
  },
  {
    value: "json",
    label: "JSON Upload",
    description: "Upload a voter list as a JSON file.",
    available: false,
  },
];

const HTTP_METHODS = [
  { value: "POST", label: "POST" },
  { value: "GET", label: "GET" },
];

// ---- Helpers -----------------------------------------------------------------

function emptyField(): FormField {
  return { id: "", label: "", type: "string", description: "" };
}

function emptyHttpConfig(): HttpApiConfig {
  return {
    url: "",
    method: "POST",
    apiKeyHeaderName: "x-api-key",
    apiKeyHeaderValue: "",
  };
}

function integrationSummary(integration: Integration): string {
  if (integration.type === "http_api") {
    const cfg = integration.config as Partial<HttpApiConfig>;
    return cfg.url || "No URL configured";
  }
  return integration.type;
}

function typeDef(value: string): IntegrationTypeDef | undefined {
  return INTEGRATION_TYPES.find((t) => t.value === value);
}

// ---- TypePickerGrid ---------------------------------------------------------
//
// Single-click → highlights a card (shows the Configure button).
// Double-click OR clicking Configure → advances to the config form.

function TypePickerGrid({
  highlighted,
  onHighlight,
  onConfigure,
  configuredType,
}: {
  highlighted: string | null;
  onHighlight: (value: string) => void;
  onConfigure: (value: string) => void;
  configuredType?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INTEGRATION_TYPES.map((t) => {
          const isHighlighted = highlighted === t.value;
          return (
            <div
              key={t.value}
              role={t.available ? "button" : undefined}
              tabIndex={t.available ? 0 : undefined}
              onClick={() => t.available && onHighlight(t.value)}
              onDoubleClick={(e) => {
                e.preventDefault();
                if (t.available) onConfigure(t.value);
              }}
              onKeyDown={(e) => {
                if (!t.available) return;
                if (e.key === "Enter") onConfigure(t.value);
                if (e.key === " ") onHighlight(t.value);
              }}
              className={[
                "p-4 border transition-colors select-none",
                t.available
                  ? isHighlighted
                    ? "border-primary bg-primary/5 cursor-pointer"
                    : "border-base-300 hover:border-base-400 cursor-pointer"
                  : "border-base-200 bg-base-50 opacity-60 cursor-not-allowed",
              ].join(" ")}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-sm">{t.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!t.available && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-base-200 text-base-content/50 rounded-full">
                      Coming soon
                    </span>
                  )}
                  {t.available &&
                    configuredType === t.value &&
                    !isHighlighted && (
                      <span className="text-xs font-medium px-2 py-0.5 bg-success/10 text-success rounded-full">
                        Configured
                      </span>
                    )}
                  {isHighlighted && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-primary text-primary-content rounded-full">
                      Selected
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="mt-1.5 text-xs text-base-content/60 leading-relaxed">
                {t.description}
              </p>

              {/* Configure button — only visible once this card is highlighted */}
              {isHighlighted && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfigure(t.value);
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Configure →
                  </button>
                  <span className="text-xs text-base-content/40">
                    or double-click
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hint when nothing is highlighted yet */}
      {highlighted === null && (
        <p className="text-xs text-base-content/40 text-center">
          Click a type to select it, then click{" "}
          <span className="font-medium">Configure</span> — or double-click to
          open it directly.
        </p>
      )}
    </div>
  );
}

// ---- Mode type ---------------------------------------------------------------

type Mode =
  | { kind: "loading" }
  | { kind: "configured"; integration: Integration }
  // no integration yet — picker step (configuring:false) or form step (configuring:true)
  | { kind: "adding"; type: string; configuring: boolean }
  // editing existing — same two steps
  | {
      kind: "editing";
      integration: Integration;
      type: string;
      configuring: boolean;
    };

// ---- Main component ----------------------------------------------------------

interface Props {
  electionId: string;
}

export function ElectionIntegrationForm({ electionId }: Props) {
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [httpConfig, setHttpConfig] =
    useState<HttpApiConfig>(emptyHttpConfig());
  const [formFields, setFormFields] = useState<FormField[]>([]);

  const populateForm = useCallback((integration: Integration) => {
    if (integration.type === "http_api") {
      setHttpConfig(integration.config as unknown as HttpApiConfig);
    } else {
      setHttpConfig(emptyHttpConfig());
    }
    setFormFields(integration.formFields);
  }, []);

  const resetForm = useCallback(() => {
    setHttpConfig(emptyHttpConfig());
    setFormFields([]);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setMode({ kind: "loading" });
    setError(null);
    getIntegration(electionId, controller.signal)
      .then((data) => {
        if (data) {
          setMode({ kind: "configured", integration: data });
          populateForm(data);
        } else {
          setMode({ kind: "adding", type: "http_api", configuring: false });
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError ? err.message : "Could not load integration.",
        );
        setMode({ kind: "adding", type: "http_api", configuring: false });
      });
    return () => controller.abort();
  }, [electionId, populateForm]);

  // ---- Derived state ---------------------------------------------------------

  const currentType =
    mode.kind === "adding" || mode.kind === "editing" ? mode.type : "http_api";

  const isInPickerStep =
    (mode.kind === "adding" || mode.kind === "editing") && !mode.configuring;

  const isInConfigStep =
    (mode.kind === "adding" || mode.kind === "editing") && mode.configuring;

  // ---- Picker navigation -----------------------------------------------------

  // Single-click: highlight a card (but stay on the picker step)
  const handleHighlight = useCallback(
    (type: string) => {
      if (mode.kind === "adding")
        setMode({ kind: "adding", type, configuring: false });
      else if (mode.kind === "editing")
        setMode({
          kind: "editing",
          integration: mode.integration,
          type,
          configuring: false,
        });
    },
    [mode],
  );

  // Double-click or "Configure" button: advance to the config form
  const handleConfigure = useCallback(
    (type: string) => {
      if (mode.kind === "adding")
        setMode({ kind: "adding", type, configuring: true });
      else if (mode.kind === "editing")
        setMode({
          kind: "editing",
          integration: mode.integration,
          type,
          configuring: true,
        });
    },
    [mode],
  );

  // "← Change type" in the config form — go back to the picker
  const handleBackToPicker = useCallback(() => {
    if (mode.kind === "adding")
      setMode({ kind: "adding", type: mode.type, configuring: false });
    else if (mode.kind === "editing")
      setMode({
        kind: "editing",
        integration: mode.integration,
        type: mode.type,
        configuring: false,
      });
  }, [mode]);

  // ---- Save / delete / edit --------------------------------------------------

  const handleSave = useCallback(async () => {
    if (mode.kind !== "adding" && mode.kind !== "editing") return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const config: Record<string, unknown> =
        currentType === "http_api" ? { ...httpConfig } : {};
      const result = await upsertIntegration(electionId, {
        type: currentType,
        config,
        formFields,
      });
      setMode({ kind: "configured", integration: result });
      populateForm(result);
      setSuccess(
        mode.kind === "editing" ? "Integration updated." : "Integration added.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save integration.",
      );
    } finally {
      setSaving(false);
    }
  }, [mode, electionId, currentType, httpConfig, formFields, populateForm]);

  const handleDelete = useCallback(async () => {
    if (mode.kind !== "configured" && mode.kind !== "editing") return;
    if (
      !confirm(
        "Remove this integration? Voters will no longer be able to self-check eligibility.",
      )
    )
      return;
    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteIntegration(electionId);
      resetForm();
      setMode({ kind: "adding", type: "http_api", configuring: false });
      setSuccess("Integration removed.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to remove integration.",
      );
    } finally {
      setDeleting(false);
    }
  }, [electionId, mode, resetForm]);

  const handleEdit = useCallback(() => {
    if (mode.kind !== "configured") return;
    // Go straight to config form when editing an existing integration
    setMode({
      kind: "editing",
      integration: mode.integration,
      type: mode.integration.type,
      configuring: true,
    });
    setSuccess(null);
    setError(null);
  }, [mode]);

  const handleCancelEdit = useCallback(() => {
    if (mode.kind !== "editing") return;
    setMode({ kind: "configured", integration: mode.integration });
    populateForm(mode.integration);
    setError(null);
    setSuccess(null);
  }, [mode, populateForm]);

  const addField = () => setFormFields((prev) => [...prev, emptyField()]);
  const removeField = (i: number) =>
    setFormFields((prev) => prev.filter((_, idx) => idx !== i));
  const updateField = (i: number, patch: Partial<FormField>) =>
    setFormFields((prev) =>
      prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    );

  // ---- Loading ---------------------------------------------------------------

  if (mode.kind === "loading") {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="md" />
      </div>
    );
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Eligibility Integrations</h3>
          <p className="text-sm text-base-content/60 mt-0.5">
            Connect an external service to verify voter eligibility.
          </p>
        </div>
        {mode.kind === "configured" && (
          <div
            className="tooltip tooltip-left"
            data-tip="Only one integration per election is supported currently."
          >
            <Button variant="ghost" size="sm" disabled>
              + Add integration
            </Button>
          </div>
        )}
      </div>

      {/* Configured / draft summary card */}
      {(mode.kind === "configured" || mode.kind === "editing") && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {typeDef(mode.integration.type)?.label ??
                    mode.integration.type}
                </span>
                {mode.kind === "configured" ? (
                  <span className="text-xs px-2 py-0.5 bg-success/10 text-success font-medium rounded-full">
                    Configured
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-warning/15 text-warning font-medium rounded-full">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-sm text-base-content/60">
                {integrationSummary(mode.integration)}
              </p>
              <p className="text-xs text-base-content/40 mt-0.5">
                {mode.integration.formFields.length} form field
                {mode.integration.formFields.length !== 1 ? "s" : ""} configured
              </p>
            </div>
            {mode.kind === "configured" && (
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={handleEdit}>
                  Edit
                </Button>
                <Button
                  variant="error"
                  size="sm"
                  onClick={handleDelete}
                  loading={deleting}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 1 — Type picker */}
      {isInPickerStep && (
        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-sm">Choose integration type</h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                More integration types will be available in future releases.
              </p>
            </div>
            <TypePickerGrid
              highlighted={currentType}
              onHighlight={handleHighlight}
              onConfigure={handleConfigure}
              configuredType={
                mode.kind === "editing" ? mode.integration.type : undefined
              }
            />
          </div>
        </Card>
      )}

      {/* Step 2 — Config form */}
      {isInConfigStep && (
        <>
          {/* Back navigation */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToPicker}>
              <ChevronLeft />
              Back
            </Button>
            <span className="text-base-content/30 text-xs">/</span>
            <span className="text-xs font-medium text-base-content/60">
              {typeDef(currentType)?.label ?? currentType}
            </span>
          </div>

          {currentType === "http_api" && (
            <Card>
              <div className="flex flex-col gap-4">
                <h3 className="font-semibold text-sm">
                  HTTP API Configuration
                </h3>
                <p className="text-xs text-base-content/60">
                  The backend will forward voter form data to this endpoint and
                  expect a 200 response when the voter is eligible.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    label="HTTP Method"
                    value={httpConfig.method}
                    onChange={(e) =>
                      setHttpConfig((c) => ({
                        ...c,
                        method: e.target.value as "GET" | "POST",
                      }))
                    }
                    options={HTTP_METHODS}
                  />
                  <div className="col-span-2">
                    <Input
                      label="Endpoint URL"
                      placeholder="https://your-api.example.com/verify"
                      value={httpConfig.url}
                      onChange={(e) =>
                        setHttpConfig((c) => ({ ...c, url: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <Input
                  label="API Key Header Name"
                  placeholder="x-api-key"
                  value={httpConfig.apiKeyHeaderName}
                  onChange={(e) =>
                    setHttpConfig((c) => ({
                      ...c,
                      apiKeyHeaderName: e.target.value,
                    }))
                  }
                />
                <Input
                  label="API Key Header Value"
                  placeholder="your-secret-key"
                  value={httpConfig.apiKeyHeaderValue}
                  onChange={(e) =>
                    setHttpConfig((c) => ({
                      ...c,
                      apiKeyHeaderValue: e.target.value,
                    }))
                  }
                />
              </div>
            </Card>
          )}

          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Voter Form Fields</h3>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    Fields voters must fill out when checking their eligibility.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={addField}>
                  + Add field
                </Button>
              </div>

              {formFields.length === 0 && (
                <p className="text-sm italic text-base-content/40">
                  No fields configured yet. Add at least one field for voters to
                  fill in.
                </p>
              )}

              {formFields.map((field, i) => (
                <div
                  key={i}
                  className="border border-base-300 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
                      Field {i + 1}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-error hover:underline"
                      onClick={() => removeField(i)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Field ID"
                      placeholder="national-id"
                      value={field.id}
                      onChange={(e) => updateField(i, { id: e.target.value })}
                    />
                    <Input
                      label="Label"
                      placeholder="National ID"
                      value={field.label}
                      onChange={(e) =>
                        updateField(i, { label: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Type (optional)"
                      placeholder="string"
                      value={field.type ?? ""}
                      onChange={(e) =>
                        updateField(i, { type: e.target.value || null })
                      }
                    />
                    <Input
                      label="Description"
                      placeholder="Voter's national ID number"
                      value={field.description}
                      onChange={(e) =>
                        updateField(i, { description: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-between items-center">
            {mode.kind === "editing" ? (
              <Button
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              {mode.kind === "editing" && (
                <Button
                  variant="error"
                  onClick={handleDelete}
                  loading={deleting}
                  disabled={saving}
                >
                  Remove integration
                </Button>
              )}
              <Button onClick={handleSave} loading={saving} disabled={deleting}>
                {mode.kind === "editing" ? "Save changes" : "Add integration"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
