import { Elysia, t } from "elysia";

import { ErrorSchema } from "../common/schemas.ts";
import { EligibilitySchema } from "../voters/schemas.ts";
import {
  CheckBodySchema,
  CheckResultSchema,
  ElectionParam,
  EnrollBodySchema,
  IntegrationSchema,
  UpsertBodySchema,
} from "./schemas.ts";
import type { IntegrationsService } from "./service.ts";
import type { AuthGuard } from "../auth/protect.ts";

export function IntegrationsController(
  service: IntegrationsService,
  auth: AuthGuard,
) {
  return new Elysia({ tags: ["Integrations"] })
    .use(auth)
    .get(
      "/elections/:id/integration",
      async ({ params, set }) => {
        const integration = await service.get(params.id);
        if (!integration) {
          set.status = 404;
          return {
            code: "INTEGRATION_NOT_CONFIGURED",
            message: `No integration configured for election ${params.id}.`,
            details: null,
          };
        }
        return integration;
      },
      {
        protect: ["admins"],
        params: ElectionParam,
        response: {
          200: IntegrationSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Get integration",
          description:
            "Returns the eligibility integration for an election, or 404 if none is configured.",
        },
      },
    )
    .put(
      "/elections/:id/integration",
      async ({ params, body, set }) => {
        const integration = await service.upsert(params.id, body);
        set.status = 200;
        return integration;
      },
      {
        protect: ["admins"],
        params: ElectionParam,
        body: UpsertBodySchema,
        response: {
          200: IntegrationSchema,
          400: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Create or replace integration",
          description:
            "Creates or replaces the eligibility integration for an election.",
        },
      },
    )
    .delete(
      "/elections/:id/integration",
      async ({ params, set }) => {
        await service.remove(params.id);
        set.status = 204;
        return null;
      },
      {
        protect: ["admins"],
        params: ElectionParam,
        response: {
          204: t.Null(),
          404: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Remove integration",
          description: "Removes the eligibility integration for an election.",
        },
      },
    )
    .post(
      "/elections/:id/eligibility-check",
      ({ params, body }) =>
        service.checkEligibility(params.id, body.voterAccountId, body.fields),
      {
        protect: ["voters"],
        params: ElectionParam,
        body: CheckBodySchema,
        response: {
          200: CheckResultSchema,
          404: ErrorSchema,
          422: ErrorSchema,
          502: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Check voter eligibility",
          description:
            "Proxies the eligibility check to the configured external integration. Returns whether the voter is eligible and their external unique identifier.",
        },
      },
    )
    .post(
      "/elections/:id/enroll",
      async ({ params, body, set }) => {
        const eligibility = await service.enroll(
          params.id,
          body.voterAccountId,
          body.email,
          body.fields,
        );
        set.status = 201;
        return eligibility;
      },
      {
        protect: ["voters"],
        params: ElectionParam,
        body: EnrollBodySchema,
        response: {
          201: EligibilitySchema,
          400: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
          409: ErrorSchema,
          422: ErrorSchema,
          502: ErrorSchema,
          500: ErrorSchema,
        },
        detail: {
          summary: "Self-enroll voter",
          description:
            "Re-verifies eligibility via the integration, then creates an eligibility record for the voter. Returns 403 if not eligible, 409 if already enrolled.",
        },
      },
    );
}
