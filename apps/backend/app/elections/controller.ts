import { Elysia } from "elysia";

import { ErrorSchema, offsetEnvelopeSchema } from "../common/schemas.ts";
import {
  CreateBodySchema,
  DeleteResponseSchema,
  ElectionSchema,
  GetQuerySchema,
  IdParams,
  ListQuerySchema,
  PatchBodySchema,
  ReplaceBodySchema,
} from "./schemas.ts";
import type { ElectionsService } from "./service.ts";

/** Convert an optional ISO string field to a Date (preserving null/undefined). */
const toDate = (v: string | null | undefined): Date | null | undefined =>
  v === undefined || v === null ? v : new Date(v);

export function ElectionsController(service: ElectionsService) {
  return new Elysia({ tags: ["Elections"] })
    .get("/elections", ({ query }) => service.list(query), {
      query: ListQuerySchema,
      response: {
        200: offsetEnvelopeSchema(ElectionSchema),
        // Bad query params (e.g. invalid `status`/`page`).
        400: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "List elections",
        description:
          "Lists elections (paginated, excludes trashed by default). Filter by status or title (`q`); use `includeDeleted` / `trash` to surface soft-deleted rows.",
      },
    })
    .post(
      "/elections",
      async ({ body, set }) => {
        const election = await service.create({
          title: body.title,
          description: body.description,
          startTime: toDate(body.startTime),
          endTime: toDate(body.endTime),
          status: body.status,
        });
        set.status = 201;
        return election;
      },
      {
        body: CreateBodySchema,
        response: {
          201: ElectionSchema,
          // Invalid body or time window.
          400: ErrorSchema,
          // DUPLICATE_TITLE.
          409: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Create election",
          description:
            "Creates a new election. The server assigns `electionId` and `electionNumber` and defaults `status` to `draft`. Returns `409 DUPLICATE_TITLE` if an active election with the same title exists.",
        },
      },
    )
    .get(
      "/elections/:id",
      ({ params, query }) => service.get(params.id, query.includeDeleted),
      {
        params: IdParams,
        query: GetQuerySchema,
        response: {
          200: ElectionSchema,
          // Malformed id.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND.
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Get election",
          description: "Fetches a single election by ID.",
        },
      },
    )
    .put(
      "/elections/:id",
      ({ params, body }) =>
        service.replace(params.id, {
          title: body.title,
          description: body.description,
          startTime: toDate(body.startTime) ?? null,
          endTime: toDate(body.endTime) ?? null,
          status: body.status,
        }),
      {
        params: IdParams,
        body: ReplaceBodySchema,
        response: {
          200: ElectionSchema,
          // Invalid body or time window.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND.
          404: ErrorSchema,
          // INVALID_STATUS_TRANSITION.
          409: ErrorSchema,
          // ELECTION_LOCKED.
          422: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Replace election",
          description:
            "Replaces an election in full. Returns `409 INVALID_STATUS_TRANSITION` for illegal status changes and `422 ELECTION_LOCKED` when editing content fields of an active/closed election.",
        },
      },
    )
    .patch(
      "/elections/:id",
      ({ params, body }) =>
        service.patch(params.id, {
          title: body.title,
          description: body.description,
          startTime: toDate(body.startTime),
          endTime: toDate(body.endTime),
          status: body.status,
        }),
      {
        params: IdParams,
        body: PatchBodySchema,
        response: {
          200: ElectionSchema,
          // Invalid body or time window.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND.
          404: ErrorSchema,
          // INVALID_STATUS_TRANSITION.
          409: ErrorSchema,
          // ELECTION_LOCKED.
          422: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Update election",
          description:
            "Partially updates an election (only supplied fields). Returns `409 INVALID_STATUS_TRANSITION` / `422 ELECTION_LOCKED` as for PUT.",
        },
      },
    )
    .delete("/elections/:id", ({ params }) => service.remove(params.id), {
      params: IdParams,
      response: {
        200: DeleteResponseSchema,
        // Malformed id.
        400: ErrorSchema,
        // RESOURCE_NOT_FOUND.
        404: ErrorSchema,
        // CANNOT_DELETE_ACTIVE.
        409: ErrorSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Delete election (soft)",
        description:
          "Soft-deletes (moves to trash) by setting `deleted = true`. Returns `409 CANNOT_DELETE_ACTIVE` if the election is currently active.",
      },
    });
}
