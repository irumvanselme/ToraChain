import { Elysia } from "elysia";
import { html } from "@elysia/html";
import { Logger, isProduction } from "@tora-chain/be-common";
import { EUserType } from "../types.ts";
import { getDevCredential, type DevUserType } from "@tora-chain/dev-configs";

import { links, ok } from "app/utils/constants";
import { config } from "../env.ts";
import { AppRegistry } from "../_apps.ts";

import { Login } from "./login.tsx";
import { Onboarding } from "./onboarding.tsx";
import { Pending } from "./pending.tsx";
import { Profile } from "./profile.tsx";
import { Register } from "./register.tsx";
import { ResetPassword } from "./reset-password.tsx";

/** Origins we are willing to redirect back to: our own + trusted SPAs. */
const allowedOrigins = new Set(
  [config.baseURL, ...config.trustedOrigins].flatMap((entry) => {
    try {
      return [new URL(entry).origin];
    } catch {
      return []; // Ignore malformed config entries.
    }
  }),
);

/**
 * Decide where to send the user after sign-in. Two shapes are honored:
 *
 *  - an absolute, same-origin path (e.g. `/elections`); or
 *  - a full URL whose origin is one of the configured `trustedOrigins` (or this
 *    service's own `baseURL`). A SPA hosted on a *different* domain than the
 *    auth service passes its full URL so we can send the admin back there.
 *
 * Everything else — protocol-relative `//evil.com`, untrusted hosts, junk — is
 * rejected to block open-redirects.
 */
function safeRedirect(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw) return undefined;

  // Absolute same-origin path. `//host` is protocol-relative (a cross-origin
  // redirect in disguise), so reject it.
  if (raw.startsWith("/")) {
    return raw.startsWith("//") ? undefined : raw;
  }

  // Otherwise it must be a well-formed URL on a trusted origin.
  try {
    return allowedOrigins.has(new URL(raw).origin) ? raw : undefined;
  } catch {
    return undefined;
  }
}

export const WebRouter = (appRegistry: AppRegistry) => {
  const web = new Elysia();
  const logger = new Logger({ name: "web-router" });

  web.get("/", links(appRegistry));

  // Outside production, surface the known dev account so the login page can
  // offer a one-click "Default login". `EUserType`'s values mirror
  // `DevUserType` exactly.
  const showDevLogin = !isProduction();

  for (const app of appRegistry.apps) {
    logger.debug(`Registering ${app.userType} routes`);
    const devLogin = showDevLogin
      ? (() => {
          const { email, password } = getDevCredential(
            app.userType as DevUserType,
          );
          return { email, password };
        })()
      : undefined;
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
            devLogin,
          }),
        )
        .get(`/register`, async () => Register({ userType: app.userType }))
        .get(`/reset-password`, async () =>
          ResetPassword({ userType: app.userType }),
        )
        .get(`/profile`, async () => Profile({ userType: app.userType }))
        .get(`/onboarding`, async () =>
          app.userType === EUserType.AUDITORS
            ? Onboarding({ userType: app.userType })
            : new Response("Not found", { status: 404 }),
        )
        .get(`/pending`, async () =>
          app.userType === EUserType.AUDITORS
            ? Pending({ userType: app.userType })
            : new Response("Not found", { status: 404 }),
        ),
    );
  }

  return web;
};
