import { Elysia } from "elysia";

import { ErrorSchema } from "../common/schemas.ts";
import {
  BallotSchema,
  CastBodySchema,
  CastResultSchema,
  Params,
  VerifyResultSchema,
  VoteParams,
} from "./schemas.ts";
import type { VotesService } from "./service.ts";
import type { AuthGuard } from "../auth/protect.ts";

export function VotesController(service: VotesService, auth: AuthGuard) {
  return new Elysia({ tags: ["Voting"] })
    .use(auth)
    .get(
      "/elections/:id/voter/:voterId/vote",
      ({ params }) => service.getBallot(params.id, params.voterId),
      {
        protect: ["voters", "admins"],
        params: Params,
        response: {
          200: BallotSchema,
          // Malformed ids.
          400: ErrorSchema,
          // NOT_ELIGIBLE.
          403: ErrorSchema,
          // RESOURCE_NOT_FOUND (election or voter).
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Get ballot",
          description:
            "Returns the ballot/voting state for a voter — the candidate list and whether they have already voted. Per-candidate tallies (`votes`) are included only once the election is `closed`. Returns `403 NOT_ELIGIBLE` if the voter is not eligible.",
        },
      },
    )
    .post(
      "/elections/:id/voter/:voterId/vote",
      async ({ params, body, set }) => {
        const result = await service.cast(params.id, params.voterId, body);
        set.status = 201;
        return result;
      },
      {
        protect: ["voters"],
        params: Params,
        body: CastBodySchema,
        response: {
          201: CastResultSchema,
          // Invalid body or malformed ids.
          400: ErrorSchema,
          // NOT_ELIGIBLE.
          403: ErrorSchema,
          // RESOURCE_NOT_FOUND (election, voter, or candidate).
          404: ErrorSchema,
          // ALREADY_VOTED or ELECTION_NOT_OPEN.
          409: ErrorSchema,
          // CANDIDATE_NOT_IN_ELECTION.
          422: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Cast ballot",
          description:
            "Casts a ballot after verifying eligibility, that the election is `active` and within its time window, and that the voter has not already voted. Optionally accepts vote-verification receipt data (`ciphertext` + `commitment`); the server re-derives the commitment from the ciphertext and anchors it on-chain. Errors: `400 VALIDATION_ERROR` (mismatched/half-supplied receipt data), `403 NOT_ELIGIBLE`, `409 ALREADY_VOTED`, `409 ELECTION_NOT_OPEN`, `422 CANDIDATE_NOT_IN_ELECTION`.",
        },
      },
    )
    .get(
      "/votes/:voteId/verify",
      ({ params }) => service.verify(params.voteId),
      {
        protect: ["voters"],
        params: VoteParams,
        response: {
          200: VerifyResultSchema,
          // Malformed vote id.
          400: ErrorSchema,
          // RESOURCE_NOT_FOUND (no vote with that id).
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Verify vote",
          description:
            "Returns the stored side of one ballot — the counted candidate (plaintext), the encrypted ballot record (`ciphertext`), and its on-chain `commitment` — so the voter's client can decrypt the receipt locally and confirm it matches. Addressed by the `voteId` from the voter's receipt (`<voteId>:<key>`) rather than by voter: the database deliberately records no link between a voter and their ballot, so no such lookup exists. The id is an unguessable random UUID and the ciphertext is useless without the receipt key. `404` if no vote has that id.",
        },
      },
    );
}
