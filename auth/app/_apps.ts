import type { Pool } from "pg";
import type { createAuth } from "./auth/shared.ts";
import type { EUserType } from "./types.ts";

export interface App {
  userType: EUserType;
  dbPool: Pool;
  auth: ReturnType<typeof createAuth>["auth"];
}

export class AppRegistry {
  private readonly _apps: App[];

  constructor() {
    this._apps = [];
  }

  registerApp(app: App) {
    this.apps.push(app);
    return this;
  }

  get apps() {
    return this._apps;
  }
}

let _appRegistry;
export const appRegistry: () => AppRegistry = () =>
  (_appRegistry ??= new AppRegistry());
