import { t, type TSchema } from "elysia";

/** Standard error body `{ code, message, details }`. */
export const ErrorSchema = t.Object(
  {
    code: t.String({ examples: ["RESOURCE_NOT_FOUND"] }),
    message: t.String({ examples: ["Election abc-123 was not found."] }),
    details: t.Union([t.Object({}, { additionalProperties: true }), t.Null()], {
      default: null,
    }),
  },
  { description: "Standard error shape used by every endpoint." },
);

/** Offset pagination metadata. */
export const OffsetPaginationSchema = t.Object({
  page: t.Integer(),
  limit: t.Integer(),
  total: t.Integer(),
  totalPages: t.Integer(),
});

/** Cursor pagination metadata. */
export const CursorPaginationSchema = t.Object({
  limit: t.Integer(),
  nextCursor: t.Union([t.String(), t.Null()]),
});

export const offsetEnvelopeSchema = (item: TSchema) =>
  t.Object({ data: t.Array(item), pagination: OffsetPaginationSchema });

export const cursorEnvelopeSchema = (item: TSchema) =>
  t.Object({ data: t.Array(item), pagination: CursorPaginationSchema });
