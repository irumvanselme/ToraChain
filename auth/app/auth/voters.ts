import { EUserType } from "../types.ts";
import { createAuth } from "./create.ts";
import type { App } from "../_apps.ts";

export class VotersApp implements App {
  userType = EUserType.VOTERS;
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
    ? new VotersApp().auth
    : null;
