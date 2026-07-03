import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Database } from "@tora-chain/be-common/database";

import { config } from "./env.ts";
import { errorHandler } from "./common/error-handler.ts";
import { reqLogger } from "./common/req-logger.ts";
import { AppHealth } from "./health.ts";

import { DrizzleElectionsRepository } from "./elections/repository.ts";
import { ElectionsService } from "./elections/service.ts";
import { ElectionsController } from "./elections/controller.ts";

import { DrizzleCandidatesRepository } from "./candidates/repository.ts";
import { CandidatesService } from "./candidates/service.ts";
import { CandidatesController } from "./candidates/controller.ts";

import { DrizzleVotersRepository } from "./voters/repository.ts";
import { VotersService } from "./voters/service.ts";
import { VotersController } from "./voters/controller.ts";
import type { AuthDirectory } from "./voters/auth-directory.ts";
import { NullAuthDirectory } from "./voters/auth-directory.ts";
import type { AuthCoreClient } from "./auth/AuthCoreService.ts";
import { NullAuthCore } from "./auth/AuthCoreService.ts";

import { DrizzleVotesRepository } from "./votes/repository.ts";
import { VotesService } from "./votes/service.ts";
import { VotesController } from "./votes/controller.ts";
import {
  NullChainNodeClient,
  type ChainNodeClient,
} from "./chain-node/client.ts";

import { DrizzleIntegrationsRepository } from "./integrations/repository.ts";
import { IntegrationsService } from "./integrations/service.ts";
import { IntegrationsController } from "./integrations/controller.ts";

import { AuditService } from "./audit/service.ts";
import { AuditController } from "./audit/controller.ts";

import { RemoteJwtVerifier, type JwtVerifier } from "./auth/jwt.ts";
import { createAuthGuard } from "./auth/protect.ts";

export interface Services {
  elections: ElectionsService;
  candidates: CandidatesService;
  voters: VotersService;
  votes: VotesService;
  integrations: IntegrationsService;
  audit: AuditService;
}

export function buildServices(
  db: NodePgDatabase,
  directory: AuthDirectory = new NullAuthDirectory(),
  authCore: AuthCoreClient = new NullAuthCore(),
  chainNode: ChainNodeClient = new NullChainNodeClient(),
  chainNodeUrl?: string,
): Services {
  const electionsRepo = new DrizzleElectionsRepository(db);
  const candidatesRepo = new DrizzleCandidatesRepository(db);
  const votersRepo = new DrizzleVotersRepository(db);
  const votesRepo = new DrizzleVotesRepository(db);
  const integrationsRepo = new DrizzleIntegrationsRepository(db);

  const elections = new ElectionsService(electionsRepo);
  const candidates = new CandidatesService(candidatesRepo, elections);
  const voters = new VotersService(votersRepo, elections, directory, authCore);
  const votes = new VotesService(
    elections,
    votersRepo,
    candidatesRepo,
    votesRepo,
    () => new Date(),
    chainNode,
  );
  const integrations = new IntegrationsService(
    integrationsRepo,
    elections,
    votersRepo,
  );
  const audit = new AuditService(db, electionsRepo, chainNodeUrl);

  return { elections, candidates, voters, votes, integrations, audit };
}

const openapiPlugin = openapi({
  path: "/docs",
  documentation: {
    info: {
      title: "ToraChain Elections API",
      version: "1.0.0",
      description:
        "Blockchain-backed elections/voting API. All bodies are JSON; resource ids are UUIDs; timestamps are ISO 8601 UTC. Errors use the shape `{ code, message, details }` with an appropriate HTTP status.",
    },
    tags: [
      { name: "Elections", description: "Manage elections." },
      {
        name: "Candidates",
        description: "Manage candidates within an election.",
      },
      {
        name: "Voters",
        description: "Manage voter eligibility for an election.",
      },
      { name: "Voting", description: "Cast and inspect ballots." },
      {
        name: "Integrations",
        description: "Manage and invoke external eligibility integrations.",
      },
      {
        name: "Audit",
        description:
          "Read-only audit endpoints for approved auditor organizations.",
      },
    ],
  },
});

export function buildApp(
  services: Services,
  database?: Database,
  auditorsAuthUrl?: string,
  verifier: JwtVerifier = new RemoteJwtVerifier(),
) {
  // Shared auth guard: every controller reuses this one instance so Elysia
  // dedupes it and the JWKS caches inside `verifier` are shared.
  const auth = createAuthGuard(verifier);

  const app = new Elysia()
    .use(reqLogger)
    .use(errorHandler)
    .use(openapiPlugin)
    .use(
      cors({
        origin: config.trustedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      }),
    )
    .use(ElectionsController(services.elections, auth))
    .use(CandidatesController(services.candidates, auth))
    .use(VotersController(services.voters, auth))
    .use(VotesController(services.votes, auth))
    .use(IntegrationsController(services.integrations, auth))
    .use(
      AuditController(
        services.audit,
        auditorsAuthUrl ?? config.auditorsAuthUrl,
        auth,
      ),
    );

  if (database) app.use(AppHealth(database));

  return app;
}
