import { status } from "elysia";

import { config } from "../env.ts";
import type { AppRegistry } from "../_apps.ts";

export const okResponse = { ok: true };
export const ok = () => status(200, okResponse);

const linksFor = (userType: string) => {
  const base = `${config.baseURL}/${userType}`;
  return {
    login: `${base}/login`,
    register: `${base}/register`,
    resetPassword: `${base}/reset-password`,
    profile: `${base}/profile`,
    apiDocs: `${base}/api/reference`,
  };
};

export const links = (appRegistry: AppRegistry) => () =>
  Object.fromEntries(
    appRegistry.apps.map((app) => [app.userType, linksFor(app.userType)]),
  );
