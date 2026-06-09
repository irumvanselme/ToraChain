import { Elysia } from "elysia";
import { Logger } from "@tora-chain/be-common";

import { html } from "@elysia/html";
import { Login } from "./Login.tsx";
import { Register } from "./Register.tsx";
import { ResetPassword } from "./ResetPassword.tsx";
import { appRegistry } from "../_apps.ts";
import { ok } from "app/utils/constants";

export const WebRouter = () => {
  const web = new Elysia();

  const logger = new Logger({ name: "web-router" });

  for (const app of appRegistry().apps) {
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
