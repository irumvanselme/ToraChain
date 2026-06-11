import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";

import { Logger } from "@tora-chain/be-common/logging";

import { EUserType } from "../types.ts";
import type { AppRegistry } from "../_apps.ts";
import { corePool } from "./db.ts";
import { CoreHttpError } from "./errors.ts";
import {
  ApiKeyService,
  CoreVotersService,
  type ApiKeyApi,
  type CoreVotersApi,
} from "./service.ts";
import { ApiKeysRepository, CoreVotersRepository } from "./repository.ts";
import {
  ApiKeyListSchema,
  ApiKeyParam,
  ApiKeySchema,
  CreateApiKeyBody,
  CreatedApiKeySchema,
  DeleteResponseSchema,
  ErrorSchema,
  UpdateApiKeyBody,
  VoterParam,
  VoterSchema,
} from "./schemas.ts";

const logger = new Logger({ name: "auth.core.router" });

export interface AdminSession {
  userId: string;
}

export interface CoreDeps {
  apiKeys: ApiKeyApi;
  voters: CoreVotersApi;
  getAdminSession(headers: Headers): Promise<AdminSession | null>;
}

async function requireAdmin(
  deps: CoreDeps,
  headers: Headers,
): Promise<AdminSession> {
  const session = await deps.getAdminSession(headers);
  if (!session) {
    throw CoreHttpError.unauthorized("Admin authentication is required.");
  }
  return session;
}

async function requireApiKey(deps: CoreDeps, headers: Headers): Promise<void> {
  const token = headers.get("x-api-key") ?? "";
  const key = await deps.apiKeys.verify(token);
  if (!key) {
    throw CoreHttpError.unauthorized("A valid API key is required.");
  }
}

export function CoreRouter(deps: CoreDeps) {
  return (
    new Elysia({ prefix: "/core/api", name: "core" })
      .use(
        openapi({
          path: "/reference",
          documentation: {
            info: {
              title: "ToraChain Core API",
              version: "1.0.0",
            },
            tags: [
              {
                name: "API Keys",
                description: "Manage service API keys (admin only).",
              },
              {
                name: "Voters",
                description: "Look up voter identities by user id.",
              },
            ],
          },
        }),
      )
      .onError(({ code, error, set }) => {
        if (error instanceof CoreHttpError) {
          set.status = error.status;
          return { code: error.code, message: error.message };
        }
        if (code === "VALIDATION") {
          set.status = 400;
          return { code: "VALIDATION", message: error.message };
        }
        if (code === "NOT_FOUND") {
          set.status = 404;
          return { code: "RESOURCE_NOT_FOUND", message: "Not found." };
        }
        logger.error("Core request error", {
          code,
          error: error instanceof Error ? error.message : String(error),
        });
        set.status = 500;
        return { code: "INTERNAL", message: "Internal server error." };
      })
      // ---- API keys (admin session required) ------------------------------
      .post(
        "/api-keys",
        async ({ request, body, set }) => {
          const admin = await requireAdmin(deps, request.headers);
          const created = await deps.apiKeys.create({
            name: body.name,
            expiresAt: body.expiresAt ?? null,
            createdBy: admin.userId,
          });
          set.status = 201;
          return created;
        },
        {
          body: CreateApiKeyBody,
          response: {
            201: CreatedApiKeySchema,
            400: ErrorSchema,
            401: ErrorSchema,
            500: ErrorSchema,
          },
          detail: {
            tags: ["API Keys"],
            summary: "Create an API key",
            description:
              "Creates an API key and returns the full token once. Only the hash is stored.",
          },
        },
      )
      .get(
        "/api-keys",
        async ({ request }) => {
          await requireAdmin(deps, request.headers);
          return deps.apiKeys.list();
        },
        {
          response: {
            200: ApiKeyListSchema,
            401: ErrorSchema,
            500: ErrorSchema,
          },
          detail: {
            tags: ["API Keys"],
            summary: "List API keys",
            description:
              "Lists API key metadata (never the token or its hash).",
          },
        },
      )
      .get(
        "/api-keys/:id",
        async ({ request, params }) => {
          await requireAdmin(deps, request.headers);
          const key = await deps.apiKeys.get(params.id);
          if (!key)
            throw CoreHttpError.notFound(`API key ${params.id} not found.`);
          return key;
        },
        {
          params: ApiKeyParam,
          response: {
            200: ApiKeySchema,
            401: ErrorSchema,
            404: ErrorSchema,
            500: ErrorSchema,
          },
          detail: { tags: ["API Keys"], summary: "Get an API key" },
        },
      )
      .patch(
        "/api-keys/:id",
        async ({ request, params, body }) => {
          await requireAdmin(deps, request.headers);
          const key = await deps.apiKeys.update(params.id, body);
          if (!key)
            throw CoreHttpError.notFound(`API key ${params.id} not found.`);
          return key;
        },
        {
          params: ApiKeyParam,
          body: UpdateApiKeyBody,
          response: {
            200: ApiKeySchema,
            400: ErrorSchema,
            401: ErrorSchema,
            404: ErrorSchema,
            500: ErrorSchema,
          },
          detail: {
            tags: ["API Keys"],
            summary: "Update an API key",
            description: "Rename, change expiry, or revoke/restore an API key.",
          },
        },
      )
      .delete(
        "/api-keys/:id",
        async ({ request, params }) => {
          await requireAdmin(deps, request.headers);
          const deleted = await deps.apiKeys.remove(params.id);
          if (!deleted) {
            throw CoreHttpError.notFound(`API key ${params.id} not found.`);
          }
          return { id: params.id, deleted: true as const };
        },
        {
          params: ApiKeyParam,
          response: {
            200: DeleteResponseSchema,
            401: ErrorSchema,
            404: ErrorSchema,
            500: ErrorSchema,
          },
          detail: { tags: ["API Keys"], summary: "Delete an API key" },
        },
      )
      // ---- Voter lookup (API key required) --------------------------------
      .get(
        "/voters/:voterUserId",
        async ({ request, params }) => {
          await requireApiKey(deps, request.headers);
          const voter = await deps.voters.getVoter(params.voterUserId);
          if (!voter) {
            throw CoreHttpError.notFound(
              `Voter ${params.voterUserId} was not found.`,
            );
          }
          return voter;
        },
        {
          params: VoterParam,
          response: {
            200: VoterSchema,
            401: ErrorSchema,
            404: ErrorSchema,
            500: ErrorSchema,
          },
          detail: {
            tags: ["Voters"],
            summary: "Get a voter by user id",
            description:
              "Looks up a voter in the voter_users table. Requires a valid `x-api-key` header.",
          },
        },
      )
  );
}

/** Wire the /core router with real services + the admins better-auth session. */
export function buildCoreRouter(appRegistry: AppRegistry) {
  const adminsApp = appRegistry.apps.find(
    (a) => a.userType === EUserType.ADMINS,
  );
  if (!adminsApp) {
    throw new Error("Core API requires the admins app to be registered.");
  }
  const adminsAuth = adminsApp.auth;

  const deps: CoreDeps = {
    apiKeys: new ApiKeyService(new ApiKeysRepository(corePool)),
    voters: new CoreVotersService(new CoreVotersRepository(corePool)),
    async getAdminSession(headers) {
      const session = await adminsAuth.api.getSession({ headers });
      return session?.user ? { userId: session.user.id } : null;
    },
  };

  return CoreRouter(deps);
}
