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
  // Vote-verification receipt data, produced client-side and optional so
  // legacy/non-encrypting clients still work. `ciphertext` is the voter's
  // AES-GCM encrypted ballot record (base64); `commitment` is its SHA-256 hex.
  // The server re-derives and cross-checks the commitment before anchoring it.
  ciphertext: t.Optional(t.String()),
  commitment: t.Optional(t.String()),
});

export const VerifyResultSchema = t.Object({
  votingNumber: t.String(),
  countedCandidateId: t.String({ format: "uuid" }),
  ciphertext: t.Union([t.String(), t.Null()]),
  commitment: t.Union([t.String(), t.Null()]),
  castAt: t.String({ format: "date-time" }),
});

export const Params = t.Object({
  id: t.String({ format: "uuid" }),
  voterId: t.String({ format: "uuid" }),
});
