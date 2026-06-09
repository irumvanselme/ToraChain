import { EUserType } from "../types.ts";
import { createAuth } from "./shared";
import type { App } from "../_apps.ts";

export class AdminApp implements App {
  userType;
  dbPool;
  auth;

  constructor() {
    this.userType = EUserType.ADMINS;
    const { auth, dbPool } = createAuth(this.userType);
    this.auth = auth;
    this.dbPool = dbPool;
  }
}
