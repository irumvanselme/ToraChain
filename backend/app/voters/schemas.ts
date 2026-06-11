import { t } from "elysia";

export const EligibilitySchema = t.Object({
  eligibilityId: t.String({ format: "uuid" }),
  voterId: t.String({ format: "uuid" }),
  accountId: t.Union([t.String(), t.Null()]),
  electionId: t.String({ format: "uuid" }),
  hasVoted: t.Boolean(),
  deleted: t.Boolean(),
});

export const ListQuerySchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  hasVoted: t.Optional(t.Boolean()),
  q: t.Optional(t.String()),
  includeDeleted: t.Optional(t.Boolean()),
  trash: t.Optional(t.Boolean()),
});

// Grant by `voterUserId` (looked up via the auth /core API) or by `email`
// directly. At least one must be supplied (validated in the service).
export const GrantBodySchema = t.Object({
  email: t.Optional(t.String({ format: "email" })),
  voterUserId: t.Optional(t.String({ minLength: 1 })),
});

export const PatchBodySchema = t.Object({
  email: t.Optional(t.String({ format: "email" })),
});

export const ElectionParam = t.Object({ id: t.String({ format: "uuid" }) });

export const Params = t.Object({
  id: t.String({ format: "uuid" }),
  voterId: t.String({ format: "uuid" }),
});

export const GetQuerySchema = t.Object({
  includeDeleted: t.Optional(t.Boolean()),
});

export const DeleteResponseSchema = t.Object({
  eligibilityId: t.String({ format: "uuid" }),
  deleted: t.Literal(true),
});
