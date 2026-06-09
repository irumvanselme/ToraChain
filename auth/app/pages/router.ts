import { Elysia } from "elysia";
import { html } from "@elysia/html";
import { Logger } from "@tora-chain/be-common";

import { links, ok } from "app/utils/constants";
import { AppRegistry } from "../_apps.ts";

import { Login } from "./login.tsx";
import { Profile } from "./profile.tsx";
import { Register } from "./register.tsx";
import { ResetPassword } from "./reset-password.tsx";

export const WebRouter = (appRegistry: AppRegistry) => {
  const web = new Elysia();
  const logger = new Logger({ name: "web-router" });

  web.get("/", links(appRegistry));

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
        )
        .get(`/profile`, async () => Profile({ userType: app.userType })),
    );
  }

  return web;
};
