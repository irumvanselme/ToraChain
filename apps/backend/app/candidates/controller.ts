import { Elysia } from "elysia";

import { ErrorSchema, offsetEnvelopeSchema } from "../common/schemas.ts";
import {
  CandidateSchema,
  CreateBodySchema,
  DeleteResponseSchema,
  ElectionParam,
  GetQuerySchema,
  ListQuerySchema,
  Params,
  PatchBodySchema,
  ReplaceBodySchema,
} from "./schemas.ts";
import type { CandidatesService } from "./service.ts";
import type { AuthGuard } from "../auth/protect.ts";

export function CandidatesController(
  service: CandidatesService,
  auth: AuthGuard,
) {
  return new Elysia({ tags: ["Candidates"] })
    .use(auth)
    .get(
      "/elections/:id/candidates",
      ({ params, query }) => service.list(params.id, query),
      {
        protect: ["voters", "admins"],
        params: ElectionParam,
        query: ListQuerySchema,
        response: {
          200: offsetEnvelopeSchema(CandidateSchema),
          // Malformed election id or query params.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (election).
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "List candidates",
          description:
            "Lists candidates for an election (paginated, excludes trashed by default).",
        },
      },
    )
    .post(
      "/elections/:id/candidates",
      async ({ params, body, set }) => {
        const candidate = await service.create(params.id, body);
        set.status = 201;
        return candidate;
      },
      {
        protect: ["admins"],
        params: ElectionParam,
        body: CreateBodySchema,
        response: {
          201: CandidateSchema,
          // Invalid body.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (election).
          404: ErrorSchema,
          // CANDIDATES_LOCKED.
          409: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Add candidate",
          description:
            "Adds a candidate to an election. The server assigns `candidateId` and `candidateNumber`. Returns `409 CANDIDATES_LOCKED` once the election leaves `draft`/`scheduled`.",
        },
      },
    )
    .get(
      "/elections/:id/candidates/:candidateId",
      ({ params, query }) =>
        service.get(params.id, params.candidateId, query.includeDeleted),
      {
        protect: ["voters", "admins"],
        params: Params,
        query: GetQuerySchema,
        response: {
          200: CandidateSchema,
          // Malformed ids.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (election or candidate).
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Get candidate",
          description: "Fetches a single candidate.",
        },
      },
    )
    .put(
      "/elections/:id/candidates/:candidateId",
      ({ params, body }) =>
        service.replace(params.id, params.candidateId, body),
      {
        protect: ["admins"],
        params: Params,
        body: ReplaceBodySchema,
        response: {
          200: CandidateSchema,
          // Invalid body or malformed ids.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (election or candidate).
          404: ErrorSchema,
          // CANDIDATES_LOCKED.
          409: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Replace candidate",
          description:
            "Replaces a candidate in full. Returns `409 CANDIDATES_LOCKED` when locked.",
        },
      },
    )
    .patch(
      "/elections/:id/candidates/:candidateId",
      ({ params, body }) => service.patch(params.id, params.candidateId, body),
      {
        protect: ["admins"],
        params: Params,
        body: PatchBodySchema,
        response: {
          200: CandidateSchema,
          // Invalid body or malformed ids.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (election or candidate).
          404: ErrorSchema,
          // CANDIDATES_LOCKED.
          409: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Update candidate",
          description:
            "Partially updates a candidate. Returns `409 CANDIDATES_LOCKED` when locked.",
        },
      },
    )
    .delete(
      "/elections/:id/candidates/:candidateId",
      ({ params }) => service.remove(params.id, params.candidateId),
      {
        protect: ["admins"],
        params: Params,
        response: {
          200: DeleteResponseSchema,
          // Malformed ids.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (election or candidate).
          404: ErrorSchema,
          // CANDIDATES_LOCKED.
          409: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Delete candidate (soft)",
          description:
            "Soft-deletes the candidate. Returns `409 CANDIDATES_LOCKED` when locked.",
        },
      },
    );
}
