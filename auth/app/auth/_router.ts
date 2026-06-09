import { Elysia } from "elysia";
import { appRegistry } from "../_apps.ts";
import { Logger } from "@tora-chain/be-common";

const logger = new Logger({ name: "auth.router" });

export function AuthRouter() {
  const router = new Elysia();

  for (const app of appRegistry().apps) {
    logger.debug(`Registering ${app.userType} auth routes`);
    router.use(
      new Elysia({ prefix: `/${app.userType}/api` }).mount(app.auth.handler),
    );
  }
  return router;
}
