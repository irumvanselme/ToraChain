import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { Logger } from "@tora-chain/be-common/logging";

import { config } from "./env.ts";
import { AppHealth } from "./health.ts";
import { WebRouter } from "./pages/router.ts";
import { AuthRouter } from "./auth/_router";
import { AppRegistry } from "./_apps.ts";
import { VotersApp } from "./auth/voters.ts";
import { AdminApp } from "./auth/admins.ts";
import { AuditorsApp } from "./auth/auditors.ts";

export class AuthServer {
  private readonly app;

  constructor(
    private log = new Logger({ name: "auth-backend.server" }),
    private appRegistry = new AppRegistry(),
  ) {
    this.app = this.buildApp();
  }

  private buildApp() {
    this.appRegistry
      .registerApp(new VotersApp())
      .registerApp(new AdminApp())
      .registerApp(new AuditorsApp());

    return new Elysia()
      .use(
        cors({
          origin: config.trustedOrigins,
          credentials: true,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        }),
      )
      .onError(({ code, error, path }) => {
        this.log.error("Request error", {
          code,
          path,
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .use(WebRouter(this.appRegistry))
      .use(AppHealth(this.appRegistry))
      .use(AuthRouter(this.appRegistry));
  }

  async start(): Promise<void> {
    this.app.listen(config.port, () => {
      this.log.info(`Auth backend listening on ${config.baseURL}}`);
    });
    this.registerShutdownHandlers();
  }

  async stop(): Promise<void> {
    this.log.info("Shutting down auth backend");
    await this.app.stop();
    await Promise.all(this.appRegistry.apps.map(({ dbPool }) => dbPool.end()));
  }

  private registerShutdownHandlers(): void {
    const shutdown = (signal: string) => {
      this.log.info("Received shutdown signal", { signal });
      void this.stop().finally(() => process.exit(0));
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  }
}

const server = new AuthServer();

if (import.meta.main) {
  await server.start();
}

export { server };
