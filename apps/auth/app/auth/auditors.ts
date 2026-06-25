import { organization } from "better-auth/plugins";

import type { App } from "../_apps.ts";
import { EUserType, auditorOrgTableNames } from "../types.ts";
import { createAuth } from "./create.ts";

const orgTables = auditorOrgTableNames();

export class AuditorsApp implements App {
  userType = EUserType.AUDITORS;
  dbPool;
  auth;

  constructor() {
    const { auth, dbPool } = createAuth(this.userType, [
      organization({
        allowUserToCreateOrganization: true,
        organizationLimit: 1,
        schema: {
          organization: {
            modelName: orgTables.organization,
            additionalFields: {
              approvalStatus: {
                type: "string" as const,
                required: false,
                input: false,
                defaultValue: "pending",
                returned: true,
              },
              approvedAt: {
                type: "date" as const,
                required: false,
                input: false,
                returned: true,
              },
              rejectionReason: {
                type: "string" as const,
                required: false,
                input: false,
                returned: true,
              },
              approvedBy: {
                type: "string" as const,
                required: false,
                input: false,
                returned: true,
              },
            },
          },
          member: { modelName: orgTables.member },
          invitation: { modelName: orgTables.invitation },
        },
      }),
    ]);
    this.auth = auth;
    this.dbPool = dbPool;
  }
}

export const auth =
  process.env.RUNNING_DB_MIGRATIONS_SCRIPTS == "true"
    ? new AuditorsApp().auth
    : null;
