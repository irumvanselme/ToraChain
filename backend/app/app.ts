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

export interface Services {
  elections: ElectionsService;
  candidates: CandidatesService;
  voters: VotersService;
  votes: VotesService;
}

export function buildServices(
  db: NodePgDatabase,
  directory: AuthDirectory = new NullAuthDirectory(),
  authCore: AuthCoreClient = new NullAuthCore(),
): Services {
  const electionsRepo = new DrizzleElectionsRepository(db);
  const candidatesRepo = new DrizzleCandidatesRepository(db);
  const votersRepo = new DrizzleVotersRepository(db);
  const votesRepo = new DrizzleVotesRepository(db);

  const elections = new ElectionsService(electionsRepo);
  const candidates = new CandidatesService(candidatesRepo, elections);
  const voters = new VotersService(votersRepo, elections, directory, authCore);
  const votes = new VotesService(
    elections,
    votersRepo,
    candidatesRepo,
    votesRepo,
  );

  return { elections, candidates, voters, votes };
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
    ],
  },
});

export function buildApp(services: Services, database?: Database) {
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
    .use(ElectionsController(services.elections))
    .use(CandidatesController(services.candidates))
    .use(VotersController(services.voters))
    .use(VotesController(services.votes));

  if (database) app.use(AppHealth(database));

  return app;
}
