import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";

import { Logger } from "@tora-chain/be-common/logging";

import { EUserType } from "../types.ts";
import type { AppRegistry } from "../_apps.ts";
import { CoreHttpError } from "../core/errors.ts";
import { DomainUsersService, type DomainUsersApi } from "./service.ts";
import {
  ErrorSchema,
  ListUsersQuery,
  UserListSchema,
  UserTypeParam,
} from "./schemas.ts";

const logger = new Logger({ name: "auth.users.router" });

export interface AdminSession {
  userId: string;
}

export interface UsersDeps {
  users: DomainUsersApi;
  getAdminSession(headers: Headers): Promise<AdminSession | null>;
}

async function requireAdmin(
  deps: UsersDeps,
  headers: Headers,
): Promise<AdminSession> {
  const session = await deps.getAdminSession(headers);
  if (!session) {
    throw CoreHttpError.unauthorized("Admin authentication is required.");
  }
  return session;
}

/**
 * Routes for admins to browse users across the identity domains.
 * Mounted under /core/api/users.
 */
export function UsersRouter(deps: UsersDeps) {
  return new Elysia({ prefix: "/core/api/users", name: "domain-users" })
    .use(
      openapi({
        path: "/reference",
        documentation: {
          info: { title: "ToraChain Users API", version: "1.0.0" },
          tags: [
            {
              name: "Users",
              description:
                "Admin listing of voter, admin, and auditor accounts.",
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
      logger.error("Users router error", {
        code,
        error: error instanceof Error ? error.message : String(error),
      });
      set.status = 500;
      return { code: "INTERNAL", message: "Internal server error." };
    })
    .get(
      "/:userType",
      async ({ request, params, query }) => {
        await requireAdmin(deps, request.headers);
        return deps.users.list(params.userType, {
          page: query.page ?? 1,
          limit: query.limit ?? 10,
          q: query.q,
        });
      },
      {
        params: UserTypeParam,
        query: ListUsersQuery,
        response: {
          200: UserListSchema,
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          tags: ["Users"],
          summary: "List users in an identity domain",
          description:
            "Paginated list of `voters`, `admins`, or `auditors` accounts, newest first. Requires an admin session. Filter by email with `q`.",
        },
      },
    );
}

/** Wire the users router with the real domain apps + admins session check. */
export function buildUsersRouter(appRegistry: AppRegistry) {
  const adminsApp = appRegistry.apps.find(
    (a) => a.userType === EUserType.ADMINS,
  );
  if (!adminsApp) {
    throw new Error("Users API requires the admins app to be registered.");
  }
  const adminsAuth = adminsApp.auth;

  const deps: UsersDeps = {
    users: new DomainUsersService(appRegistry.apps),
    async getAdminSession(headers) {
      const session = await adminsAuth.api.getSession({ headers });
      return session?.user ? { userId: session.user.id } : null;
    },
  };

  return UsersRouter(deps);
}
