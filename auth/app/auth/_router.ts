import { Elysia } from "elysia";
import { Logger } from "@tora-chain/be-common";

import { AppRegistry } from "app/_apps.ts";

const logger = new Logger({ name: "auth.router" });

/**
 * Registers auth routes for all user types.
 * Each app's auth handler is mounted under /{userType}/api.
 */
export function AuthRouter(appRegistry: AppRegistry) {
  const router = new Elysia();

  for (const app of appRegistry.apps) {
    logger.debug(
      `registering ${app.userType} auth routes under /${app.userType}/api/*`,
    );
    router.use(
      new Elysia({ prefix: `/${app.userType}/api` }).mount(app.auth.handler),
    );
  }
  return router;
}
