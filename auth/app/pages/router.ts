import { Elysia } from "elysia";
import { html } from "@elysia/html";
import { Logger } from "@tora-chain/be-common";

import { Login } from "./Login.tsx";
import { ok } from "app/utils/constants";
import { Register } from "./Register.tsx";
import { AppRegistry } from "../_apps.ts";
import { ResetPassword } from "./ResetPassword.tsx";

export const WebRouter = (appRegistry: AppRegistry) => {
  const web = new Elysia();
  const logger = new Logger({ name: "web-router" });
  for (const app of appRegistry.apps) {
    logger.debug(`Registering ${app.userType} routes`);
    web.use(
      new Elysia({ prefix: `/${app.userType}` })
        .use(html())
        .get(`/ok`, ok)
        .get(`/login`, async () => Login({ userType: app.userType }))
        .get(`/register`, async () => Register({ userType: app.userType }))
        .get(`/reset-password`, async () =>
          ResetPassword({ userType: app.userType }),
        ),
    );
  }

  return web;
};
