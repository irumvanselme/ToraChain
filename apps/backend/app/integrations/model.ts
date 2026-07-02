import { jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { elections } from "../elections/model.ts";
import { createdAt, updatedAt } from "../common/timestamps.ts";

// ---- Integration types ---------------------------------------------------

/**
 * Supported integration types. Each type uses a different mechanism to
 * verify voter eligibility. Add new literals here as new types are built.
 *
 * - http_api  : Forward voter data to an external HTTP endpoint.
 * - web3      : (future) Query a smart contract on-chain.
 * - csv       : (future) Check against an uploaded CSV list.
 * - json      : (future) Check against an uploaded JSON list.
 */
export const INTEGRATION_TYPES = ["http_api"] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

/**
 * Well-known values for `FormField.type`. Any string is accepted (the value
 * is only a rendering hint for the voting frontend), but these get dedicated
 * input widgets:
 *
 * - string      : Plain text input (default).
 * - fingerprint : Demo biometric — the voting frontend shows a mock
 *                 fingerprint scanner that fills in a hardcoded scan string.
 * - eyes        : Demo biometric — mock eye-recognition camera, same idea.
 */
export const FIELD_INPUT_TYPES = ["string", "fingerprint", "eyes"] as const;
export type FieldInputType = (typeof FIELD_INPUT_TYPES)[number];

/** A single form field the voter must fill in to verify eligibility. */
export interface FormField {
  id: string;
  label: string;
  /** Input type hint (see FIELD_INPUT_TYPES). Null means unspecified. */
  type: string | null;
  description: string;
}

/** Config specific to the `http_api` integration type. */
export interface HttpApiConfig {
  url: string;
  method: "GET" | "POST";
  apiKeyHeaderName: string;
  apiKeyHeaderValue: string;
}

// ---- Table ---------------------------------------------------------------

export const electionIntegrations = pgTable("election_integrations", {
  integrationId: uuid("integration_id").defaultRandom().primaryKey(),
  electionId: uuid("election_id")
    .notNull()
    .unique()
    .references(() => elections.electionId, { onDelete: "cascade" }),
  type: text("type").notNull().default("http_api"),
  /** Type-specific configuration (shape depends on `type`). */
  config: jsonb("config")
    .notNull()
    .$type<Record<string, unknown>>()
    .default({}),
  /** Voter-facing form fields required to perform the eligibility check. */
  formFields: jsonb("form_fields").notNull().$type<FormField[]>().default([]),
  createdAt,
  updatedAt,
});

export type IntegrationRow = typeof electionIntegrations.$inferSelect;
export type IntegrationInsert = typeof electionIntegrations.$inferInsert;

// ---- DTO -----------------------------------------------------------------

export interface IntegrationDTO {
  integrationId: string;
  electionId: string;
  type: string;
  config: Record<string, unknown>;
  formFields: FormField[];
}

export function serializeIntegration(row: IntegrationRow): IntegrationDTO {
  return {
    integrationId: row.integrationId,
    electionId: row.electionId,
    type: row.type,
    config: row.config,
    formFields: row.formFields,
  };
}

// ---- Service types -------------------------------------------------------

export interface CheckResult {
  eligible: boolean;
  externalVoterId?: string;
  /** Human-readable reason from the integration when not eligible. */
  reason?: string;
}
