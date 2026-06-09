import { Elysia } from "elysia";
import { appRegistry } from "../_apps.ts";

export function AuthRouter() {
  const router = new Elysia();

  for (const app of appRegistry().apps) {
    router.use(
      new Elysia({ prefix: `/${app.userType}/api` }).mount(app.auth.handler),
    );
  }
  return router;
}
