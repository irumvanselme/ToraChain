import { EUserType } from "../types.ts";
import { createAuth } from "./create";
import type { App } from "../_apps.ts";

export class AuditorsApp implements App {
  userType;
  dbPool;
  auth;

  constructor() {
    this.userType = EUserType.AUDITORS;
    const { auth, dbPool } = createAuth(this.userType);
    this.auth = auth;
    this.dbPool = dbPool;
  }
}
