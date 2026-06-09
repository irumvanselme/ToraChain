import { EUserType } from "../types.ts";
import { createAuth } from "./shared.ts";
import type { App } from "../_apps.ts";

export class VotersApp implements App {
  userType;
  dbPool;
  auth;

  constructor() {
    this.userType = EUserType.VOTERS;
    const { auth, dbPool } = createAuth(this.userType);
    this.auth = auth;
    this.dbPool = dbPool;
  }
}
