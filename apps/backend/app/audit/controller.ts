import { Elysia } from "elysia";

import { requireApprovedAuditor } from "./auth-client.ts";
import type { AuditService } from "./service.ts";
import {
  AuditElectionIdParams,
  AuditElectionListSchema,
  AuditElectionSchema,
  AuditListQuerySchema,
  BlockchainDataSchema,
  ElectionResultsSchema,
  ErrorSchema,
} from "./schemas.ts";

export function AuditController(
  service: AuditService,
  auditorsAuthUrl: string,
) {
  return new Elysia({ tags: ["Audit"] })
    .get(
      "/audit/elections",
      async ({ request, query }) => {
        await requireApprovedAuditor(
          auditorsAuthUrl,
          request.headers.get("Authorization"),
        );
        return service.listElections(query);
      },
      {
        query: AuditListQuerySchema,
        response: {
          200: AuditElectionListSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "List elections for audit",
          description:
            "Returns active and ended elections visible to approved auditors. Requires `Authorization: Bearer <token>` from the auditor JWT endpoint.",
        },
      },
    )
    .get(
      "/audit/elections/:id",
      async ({ request, params }) => {
        await requireApprovedAuditor(
          auditorsAuthUrl,
          request.headers.get("Authorization"),
        );
        return service.getElection(params.id);
      },
      {
        params: AuditElectionIdParams,
        response: {
          200: AuditElectionSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Get an election for audit",
          description:
            "Returns full election details for an active or ended election.",
        },
      },
    )
    .get(
      "/audit/elections/:id/results",
      async ({ request, params }) => {
        await requireApprovedAuditor(
          auditorsAuthUrl,
          request.headers.get("Authorization"),
        );
        return service.getResults(params.id);
      },
      {
        params: AuditElectionIdParams,
        response: {
          200: ElectionResultsSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Get anonymised election results",
          description:
            "Returns vote tallies per candidate. No voter identities are included.",
        },
      },
    )
    .get(
      "/audit/elections/:id/blockchain",
      async ({ request, params }) => {
        await requireApprovedAuditor(
          auditorsAuthUrl,
          request.headers.get("Authorization"),
        );
        return service.getBlockchainData(params.id);
      },
      {
        params: AuditElectionIdParams,
        response: {
          200: BlockchainDataSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Download blockchain data for an election",
          description:
            "Returns all blocks on the chain-node that belong to this election. Requires the chain-node to be running.",
        },
      },
    );
}
