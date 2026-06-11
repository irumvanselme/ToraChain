import { t } from "elysia";

export const ErrorSchema = t.Object({
  code: t.String(),
  message: t.String(),
});

const apiKeyFields = {
  id: t.String({ format: "uuid" }),
  name: t.String(),
  prefix: t.String(),
  createdBy: t.Union([t.String(), t.Null()]),
  lastUsedAt: t.Union([t.String(), t.Null()]),
  expiresAt: t.Union([t.String(), t.Null()]),
  revoked: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
} as const;

export const ApiKeySchema = t.Object(apiKeyFields);

// A flat object (not t.Intersect) so response validation stays deterministic.
export const CreatedApiKeySchema = t.Object({
  ...apiKeyFields,
  token: t.String({
    description: "The full API key. Shown once — store it securely.",
  }),
});

export const ApiKeyListSchema = t.Array(ApiKeySchema);

export const CreateApiKeyBody = t.Object({
  name: t.String({ minLength: 1 }),
  expiresAt: t.Optional(t.Union([t.String({ format: "date-time" }), t.Null()])),
});

export const UpdateApiKeyBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  expiresAt: t.Optional(t.Union([t.String({ format: "date-time" }), t.Null()])),
  revoked: t.Optional(t.Boolean()),
});

export const ApiKeyParam = t.Object({ id: t.String({ format: "uuid" }) });

export const VoterParam = t.Object({ voterUserId: t.String({ minLength: 1 }) });

export const VoterSchema = t.Object({
  id: t.String(),
  name: t.String(),
  email: t.String(),
  emailVerified: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const DeleteResponseSchema = t.Object({
  id: t.String({ format: "uuid" }),
  deleted: t.Literal(true),
});
