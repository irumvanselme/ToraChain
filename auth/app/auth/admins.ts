import { EUserType } from "../types";
import { createAuth } from "./create";
import type { App } from "../_apps";

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
