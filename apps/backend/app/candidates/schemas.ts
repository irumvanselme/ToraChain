import { t } from "elysia";

export const CandidateSchema = t.Object({
  candidateId: t.String({ format: "uuid" }),
  electionId: t.String({ format: "uuid" }),
  fullName: t.String(),
  manifesto: t.Union([t.String(), t.Null()]),
  deleted: t.Boolean(),
});

export const ListQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  q: t.Optional(t.String()),
  includeDeleted: t.Optional(t.Boolean()),
  trash: t.Optional(t.Boolean()),
});

export const CreateBodySchema = t.Object({
  fullName: t.String({ minLength: 1 }),
  manifesto: t.Optional(t.Union([t.String(), t.Null()])),
});

export const ReplaceBodySchema = t.Object({
  fullName: t.String({ minLength: 1 }),
  manifesto: t.Union([t.String(), t.Null()]),
});

export const PatchBodySchema = t.Object({
  fullName: t.Optional(t.String({ minLength: 1 })),
  manifesto: t.Optional(t.Union([t.String(), t.Null()])),
});

export const Params = t.Object({
  id: t.String({ format: "uuid" }),
  candidateId: t.String({ format: "uuid" }),
});

export const ElectionParam = t.Object({ id: t.String({ format: "uuid" }) });

export const GetQuerySchema = t.Object({
  includeDeleted: t.Optional(t.Boolean()),
});

export const DeleteResponseSchema = t.Object({
  candidateId: t.String({ format: "uuid" }),
  deleted: t.Literal(true),
});
