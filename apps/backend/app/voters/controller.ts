import { Elysia } from "elysia";

import { ErrorSchema, cursorEnvelopeSchema } from "../common/schemas.ts";
import {
  DeleteResponseSchema,
  ElectionParam,
  EligibilitySchema,
  GetQuerySchema,
  GrantBodySchema,
  ListQuerySchema,
  Params,
  PatchBodySchema,
} from "./schemas.ts";
import type { VotersService } from "./service.ts";
import type { AuthGuard } from "../auth/protect.ts";

export function VotersController(service: VotersService, auth: AuthGuard) {
  return new Elysia({ tags: ["Voters"] })
    .use(auth)
    .get(
      "/elections/:id/voters",
      ({ params, query }) => service.list(params.id, query),
      {
        protect: ["admins"],
        params: ElectionParam,
        query: ListQuerySchema,
        response: {
          200: cursorEnvelopeSchema(EligibilitySchema),
          // Malformed election id or query params (e.g. bad cursor).
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (election).
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "List eligible voters",
          description:
            "Lists voters eligible for an election (cursor-paginated), joined with their eligibility row.",
        },
      },
    )
    .post(
      "/elections/:id/voters",
      async ({ params, body, set }) => {
        const eligibility = await service.grant(params.id, body);
        set.status = 201;
        return eligibility;
      },
      {
        protect: ["admins"],
        params: ElectionParam,
        body: GrantBodySchema,
        response: {
          201: EligibilitySchema,
          // Invalid body (e.g. malformed email).
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (election, or voter account when auth is enforced).
          404: ErrorSchema,
          // ALREADY_ELIGIBLE.
          409: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Grant eligibility",
          description:
            "Grants a voter eligibility for the election with a server-assigned `votingNumber`. Provide `voterUserId` to resolve the voter via the auth /core API, or `email` to verify against the auth directory. Returns `409 ALREADY_ELIGIBLE` if already granted.",
        },
      },
    )
    .get(
      "/elections/:id/voters/:voterId",
      ({ params, query }) =>
        service.get(params.id, params.voterId, query.includeDeleted),
      {
        protect: ["admins"],
        params: Params,
        query: GetQuerySchema,
        response: {
          200: EligibilitySchema,
          // Malformed ids.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (election or eligibility).
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Get voter eligibility",
          description: "Fetches one voter's eligibility for the election.",
        },
      },
    )
    .patch(
      "/elections/:id/voters/:voterId",
      ({ params, body }) => service.patch(params.id, params.voterId, body),
      {
        protect: ["admins"],
        params: Params,
        body: PatchBodySchema,
        response: {
          200: EligibilitySchema,
          // Invalid body, or the new email is already in use by another voter.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (election, eligibility, or account when enforced).
          404: ErrorSchema,
          // ALREADY_VOTED.
          422: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Update voter",
          description:
            "Updates a voter's editable fields (partial). `hasVoted`/`votingNumber` are server-managed. Returns `422 ALREADY_VOTED` for changes disallowed after voting.",
        },
      },
    )
    .delete(
      "/elections/:id/voters/:voterId",
      ({ params }) => service.remove(params.id, params.voterId),
      {
        protect: ["admins"],
        params: Params,
        response: {
          200: DeleteResponseSchema,
          // Malformed ids.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (election or eligibility).
          404: ErrorSchema,
          // ALREADY_VOTED.
          409: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Revoke eligibility (soft)",
          description:
            "Revokes eligibility (soft-deletes the eligibility row). Returns `409 ALREADY_VOTED` if the voter has already cast a ballot.",
        },
      },
    );
}
