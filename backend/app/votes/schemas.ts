import { t } from "elysia";

import { StatusSchema } from "../elections/schemas.ts";

export const BallotCandidateSchema = t.Object({
  candidateId: t.String({ format: "uuid" }),
  // 216-bit identifier serialized as a decimal string.
  candidateNumber: t.String(),
  fullName: t.String(),
  votes: t.Optional(t.Integer()),
});

export const BallotSchema = t.Object({
  electionId: t.String({ format: "uuid" }),
  status: StatusSchema,
  voter: t.Object({
    voterId: t.String({ format: "uuid" }),
    votingNumber: t.String(),
    hasVoted: t.Boolean(),
  }),
  candidates: t.Array(BallotCandidateSchema),
});

export const CastResultSchema = t.Object({
  accepted: t.Literal(true),
  votingNumber: t.String(),
  castAt: t.String({ format: "date-time" }),
});

export const CastBodySchema = t.Object({
  candidateId: t.String({ format: "uuid" }),
});

export const Params = t.Object({
  id: t.String({ format: "uuid" }),
  voterId: t.String({ format: "uuid" }),
});
