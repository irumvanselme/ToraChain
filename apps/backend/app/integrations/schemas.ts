import { t } from "elysia";

export const ElectionParam = t.Object({ id: t.String({ format: "uuid" }) });

export const FormFieldSchema = t.Object({
  id: t.String({ minLength: 1 }),
  label: t.String({ minLength: 1 }),
  type: t.Union([t.String(), t.Null()]),
  description: t.String(),
});

export const HttpApiConfigSchema = t.Object({
  url: t.String({ minLength: 1 }),
  method: t.Union([t.Literal("GET"), t.Literal("POST")]),
  apiKeyHeaderName: t.String({ minLength: 1 }),
  apiKeyHeaderValue: t.String({ minLength: 1 }),
});

/**
 * Union of all type-specific config schemas. Extend this union as new
 * integration types are added (e.g. Web3ConfigSchema, CsvConfigSchema).
 */
export const AnyConfigSchema = t.Union([HttpApiConfigSchema]);

export const UpsertBodySchema = t.Object({
  type: t.Union([t.Literal("http_api")], { examples: ["http_api"] }),
  config: AnyConfigSchema,
  formFields: t.Array(FormFieldSchema),
});

export const IntegrationSchema = t.Object({
  integrationId: t.String({ format: "uuid" }),
  electionId: t.String({ format: "uuid" }),
  type: t.String(),
  config: t.Unknown(),
  formFields: t.Array(FormFieldSchema),
});

export const CheckBodySchema = t.Object({
  voterAccountId: t.String({ minLength: 1 }),
  fields: t.Record(t.String(), t.String()),
});

export const EnrollBodySchema = t.Object({
  voterAccountId: t.String({ minLength: 1 }),
  email: t.String({ format: "email" }),
  fields: t.Record(t.String(), t.String()),
});

export const CheckResultSchema = t.Object({
  eligible: t.Boolean(),
  externalVoterId: t.Optional(t.String()),
  reason: t.Optional(t.String()),
});
