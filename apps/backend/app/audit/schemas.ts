import { t } from "elysia";

import { ErrorSchema, offsetEnvelopeSchema } from "../common/schemas.ts";

export { ErrorSchema };

export const AuditElectionSchema = t.Object({
  electionId: t.String(),
  title: t.String(),
  description: t.Nullable(t.String()),
  status: t.String(),
  startTime: t.Nullable(t.String()),
  endTime: t.Nullable(t.String()),
  deleted: t.Boolean(),
  totalVotes: t.Integer(),
});

export const AuditElectionListSchema = offsetEnvelopeSchema(AuditElectionSchema);

export const CandidateResultSchema = t.Object({
  candidateId: t.String(),
  fullName: t.String(),
  voteCount: t.Number(),
});

export const ElectionResultsSchema = t.Object({
  electionId: t.String(),
  title: t.String(),
  status: t.String(),
  totalVotes: t.Number(),
  candidates: t.Array(CandidateResultSchema),
});

export const BlockEntrySchema = t.Object({
  blockIndex: t.Number(),
  electionId: t.String(),
  votingNumber: t.String(),
  candidateId: t.String(),
  timestamp: t.String(),
  prevHash: t.String(),
  hash: t.String(),
});

export const BlockchainDataSchema = t.Array(BlockEntrySchema);

export const AuditElectionIdParams = t.Object({ id: t.String() });

export const AuditListQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  q: t.Optional(t.String()),
});
