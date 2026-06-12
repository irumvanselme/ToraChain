import { Elysia } from "elysia";
import { html } from "@elysia/html";
import { Logger } from "@tora-chain/be-common";

import { links, ok } from "app/utils/constants";
import { AppRegistry } from "../_apps.ts";

import { Login } from "./login.tsx";
import { Profile } from "./profile.tsx";
import { Register } from "./register.tsx";
import { ResetPassword } from "./reset-password.tsx";

/**
 * Only honor same-origin, absolute-path redirects (e.g. `/elections`). This
 * blocks open-redirects to external hosts (`//evil.com`, `https://…`) while
 * still letting a SPA served from the same gateway send the admin back to where
 * they came from after signing in.
 */
function safeRedirect(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw) return undefined;
  if (!raw.startsWith("/") || raw.startsWith("//")) return undefined;
  return raw;
}

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
        .get(`/login`, async ({ query }) =>
          Login({
            userType: app.userType,
            redirectTo: safeRedirect(
              (query as Record<string, string | undefined>).redirect,
            ),
          }),
        )
        .get(`/register`, async () => Register({ userType: app.userType }))
        .get(`/reset-password`, async () =>
          ResetPassword({ userType: app.userType }),
        )
        .get(`/profile`, async () => Profile({ userType: app.userType })),
    );
  }

  return web;
};
