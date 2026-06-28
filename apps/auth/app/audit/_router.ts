import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";

import { Logger } from "@tora-chain/be-common/logging";
import type { AppRegistry } from "../_apps.ts";
import { EUserType } from "../types.ts";
import { corePool } from "../core/db.ts";
import { CoreHttpError } from "../core/errors.ts";
import { AuditOrgRepository } from "./repository.ts";
import { AuditOrgService } from "./service.ts";
import {
  ApproveBody,
  AuditStatusSchema,
  ErrorSchema,
  FilterQuery,
  OrgIdParam,
  OrgListSchema,
  OrgStatusSchema,
  RejectBody,
} from "./schemas.ts";

const logger = new Logger({ name: "auth.audit.router" });

/**
 * Routes for the auditor domain: auditors check their own org status.
 * Mounted under /auditors/audit (outside better-auth's basePath).
 */
export function AuditorAuditRouter(appRegistry: AppRegistry) {
  const auditorsApp = appRegistry.apps.find(
    (a) => a.userType === EUserType.AUDITORS,
  );
  if (!auditorsApp) throw new Error("Auditors app not registered.");

  const service = new AuditOrgService(new AuditOrgRepository(corePool));

  return new Elysia({ prefix: "/auditors/audit" })
    .onError(({ code, error, set }) => {
      if (error instanceof CoreHttpError) {
        set.status = error.status;
        return { code: error.code, message: error.message };
      }
      if (code === "VALIDATION") {
        set.status = 400;
        return { code: "VALIDATION", message: error.message };
      }
      logger.error("Audit router error", {
        code,
        error: error instanceof Error ? error.message : String(error),
      });
      set.status = 500;
      return { code: "INTERNAL", message: "Internal server error." };
    })
    .get(
      "/status",
      async ({ request }) => {
        const session = await auditorsApp.auth.api.getSession({
          headers: request.headers,
        });
        if (!session?.user) {
          throw CoreHttpError.unauthorized(
            "Auditor authentication is required.",
          );
        }
        const org = await service.getStatusByUserId(session.user.id);
        return {
          userId: session.user.id,
          name: session.user.name,
          email: session.user.email,
          org,
        };
      },
      {
        response: {
          200: AuditStatusSchema,
          401: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          tags: ["Audit"],
          summary: "Get auditor status",
          description:
            "Returns the current auditor's session user and org approval status.",
        },
      },
    );
}

/**
 * Routes for admins to manage auditor org approvals.
 * Mounted under /core/api/audit-orgs.
 */
export function AdminAuditRouter(appRegistry: AppRegistry) {
  const adminsApp = appRegistry.apps.find(
    (a) => a.userType === EUserType.ADMINS,
  );
  if (!adminsApp) throw new Error("Admins app not registered.");
  const adminsAuth = adminsApp.auth;

  const service = new AuditOrgService(new AuditOrgRepository(corePool));

  async function requireAdmin(headers: Headers) {
    const session = await adminsAuth.api.getSession({ headers });
    if (!session?.user) {
      throw CoreHttpError.unauthorized("Admin authentication is required.");
    }
    return session.user;
  }

  return new Elysia({ prefix: "/core/api/audit-orgs" })
    .use(
      openapi({
        path: "/reference",
        documentation: {
          info: { title: "ToraChain Audit Orgs API", version: "1.0.0" },
          tags: [
            {
              name: "Audit",
              description:
                "Admin management of auditor organization approvals.",
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
      logger.error("Admin audit router error", {
        code,
        error: error instanceof Error ? error.message : String(error),
      });
      set.status = 500;
      return { code: "INTERNAL", message: "Internal server error." };
    })
    .get(
      "/",
      async ({ request, query }) => {
        await requireAdmin(request.headers);
        return service.listOrgs(query.filter);
      },
      {
        query: FilterQuery,
        response: { 200: OrgListSchema, 401: ErrorSchema, 500: ErrorSchema },
        detail: {
          tags: ["Audit"],
          summary: "List auditor organizations",
          description:
            "Lists all auditor organizations with approval status. Filter by `filter=pending|approved|rejected`.",
        },
      },
    )
    .post(
      "/:orgId/approve",
      async ({ request, params, set }) => {
        const admin = await requireAdmin(request.headers);
        const org = await service.approve(params.orgId, admin.id);
        if (!org)
          throw CoreHttpError.notFound(
            `Organization ${params.orgId} not found.`,
          );
        set.status = 200;
        return org;
      },
      {
        params: OrgIdParam,
        body: ApproveBody,
        response: {
          200: OrgStatusSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          tags: ["Audit"],
          summary: "Approve an auditor organization",
        },
      },
    )
    .post(
      "/:orgId/reject",
      async ({ request, params, body, set }) => {
        const admin = await requireAdmin(request.headers);
        const org = await service.reject(params.orgId, body.reason, admin.id);
        if (!org)
          throw CoreHttpError.notFound(
            `Organization ${params.orgId} not found.`,
          );
        set.status = 200;
        return org;
      },
      {
        params: OrgIdParam,
        body: RejectBody,
        response: {
          200: OrgStatusSchema,
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          tags: ["Audit"],
          summary: "Reject an auditor organization",
        },
      },
    );
}
