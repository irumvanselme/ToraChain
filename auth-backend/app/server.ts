import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { Logger, logger as rootLogger } from "@tora-chain/be-common";

import { config } from "./config/env.ts";
import { auth } from "./auth.ts";
import { database } from "./db";


export class AuthServer {
  private readonly app;
  private readonly log: Logger;

  constructor(logger: Logger = rootLogger) {
    this.log = logger.child({ service: "auth-backend", component: "http" });
    this.app = this.buildApp();
  }

  private buildApp() {
    return (
      new Elysia()
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
        .get("/health", async () => {
          const dbHealthy = await database.ping();
          return {
            status: dbHealthy ? "ok" : "degraded",
            database: dbHealthy ? "up" : "down",
          };
        })
        .all(`${config.basePath}/*`, ({ request }) => auth.handler(request))
    );
  }

  async start(): Promise<void> {
    await database.connect();

    this.app.listen(config.port, () => {
      this.log.info("Auth backend listening", {
        url: config.betterAuthUrl,
        authBasePath: config.basePath,
        port: config.port,
      });
    });

    this.registerShutdownHandlers();
  }

  async stop(): Promise<void> {
    this.log.info("Shutting down auth backend");
    await this.app.stop();
    await database.close();
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
await server.start();

export { server };
