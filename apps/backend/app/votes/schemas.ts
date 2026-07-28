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
  // First half of the voter's receipt (`<voteId>:<key>`); the only handle that
  // leads back to this ballot, as nothing in the database links it to a voter.
  voteId: t.String({ format: "uuid" }),
  votingNumber: t.String(),
  castAt: t.String({ format: "date-time" }),
});

export const CastBodySchema = t.Object({
  candidateId: t.String({ format: "uuid" }),
  // Vote-verification receipt data, produced client-side and optional so
  // legacy/non-encrypting clients still work. `ciphertext` is the voter's
  // AES-GCM encrypted ballot record (base64); `commitment` is its SHA-256 hex.
  // The server re-derives and cross-checks the commitment before anchoring it.
  ciphertext: t.Optional(t.String()),
  commitment: t.Optional(t.String()),
});

export const VerifyResultSchema = t.Object({
  voteId: t.String({ format: "uuid" }),
  electionId: t.String({ format: "uuid" }),
  countedCandidateId: t.String({ format: "uuid" }),
  ciphertext: t.Union([t.String(), t.Null()]),
  commitment: t.Union([t.String(), t.Null()]),
  castAt: t.String({ format: "date-time" }),
});

export const Params = t.Object({
  id: t.String({ format: "uuid" }),
  voterId: t.String({ format: "uuid" }),
});

/** Verification is addressed by ballot, not by voter — see `service.verify`. */
export const VoteParams = t.Object({
  voteId: t.String({ format: "uuid" }),
});
