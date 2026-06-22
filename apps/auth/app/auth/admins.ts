import type { App } from "../_apps.ts";
import { EUserType } from "../types.ts";
import { createAuth } from "./create.ts";

export class AdminApp implements App {
  userType = EUserType.ADMINS;
  dbPool;
  auth;

  constructor() {
    const { auth, dbPool } = createAuth(this.userType);
    this.auth = auth;
    this.dbPool = dbPool;
  }
}

export const auth =
  process.env.RUNNING_DB_MIGRATIONS_SCRIPTS == "true"
    ? new AdminApp().auth
    : null;
