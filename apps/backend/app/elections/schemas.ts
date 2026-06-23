import { t } from "elysia";

// Explicit literal members (a `.map` over the enum would widen to `never`).
export const StatusSchema = t.Union(
  [
    t.Literal("draft"),
    t.Literal("enrolling_voters"),
    t.Literal("scheduled"),
    t.Literal("active"),
    t.Literal("ended"),
    t.Literal("archived"),
    t.Literal("paused"),
  ],
  { examples: ["draft"] },
);

export const ElectionSchema = t.Object({
  electionId: t.String({ format: "uuid" }),
  title: t.String(),
  description: t.Union([t.String(), t.Null()]),
  status: StatusSchema,
  startTime: t.Union([t.String({ format: "date-time" }), t.Null()]),
  endTime: t.Union([t.String({ format: "date-time" }), t.Null()]),
  deleted: t.Boolean(),
});

export const ListQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  status: t.Optional(StatusSchema),
  q: t.Optional(t.String()),
  includeDeleted: t.Optional(t.Boolean()),
  trash: t.Optional(t.Boolean()),
});

export const CreateBodySchema = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.Optional(t.Union([t.String(), t.Null()])),
  startTime: t.Optional(t.Union([t.String({ format: "date-time" }), t.Null()])),
  endTime: t.Optional(t.Union([t.String({ format: "date-time" }), t.Null()])),
  status: t.Optional(StatusSchema),
});

export const ReplaceBodySchema = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.Union([t.String(), t.Null()]),
  startTime: t.Union([t.String({ format: "date-time" }), t.Null()]),
  endTime: t.Union([t.String({ format: "date-time" }), t.Null()]),
  status: StatusSchema,
});

export const PatchBodySchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.Union([t.String(), t.Null()])),
  startTime: t.Optional(t.Union([t.String({ format: "date-time" }), t.Null()])),
  endTime: t.Optional(t.Union([t.String({ format: "date-time" }), t.Null()])),
  status: t.Optional(StatusSchema),
});

export const IdParams = t.Object({ id: t.String({ format: "uuid" }) });

export const GetQuerySchema = t.Object({
  includeDeleted: t.Optional(t.Boolean()),
});

export const DeleteResponseSchema = t.Object({
  electionId: t.String({ format: "uuid" }),
  deleted: t.Literal(true),
});
