import { Logger } from "@tora-chain/be-common/logging";

import { config } from "./env.ts";
import { database, db } from "./db.ts";
import { buildApp, buildServices } from "./app.ts";
import {
  NullAuthDirectory,
  PgAuthDirectory,
  type AuthDirectory,
} from "./voters/auth-directory.ts";

export class BackendServer {
  private readonly app;
  private readonly directory: AuthDirectory;

  constructor(private log = new Logger({ name: "backend.server" })) {
    this.directory = config.votersAuthDbUrl
      ? new PgAuthDirectory(config.votersAuthDbUrl)
      : new NullAuthDirectory();

    if (!this.directory.enforced) {
      this.log.warn(
        "VOTERS_AUTH_DB_URI is not set — voter eligibility will not be verified against the auth backend.",
      );
    }

    const services = buildServices(db, this.directory);
    this.app = buildApp(services, database);
  }

  async start(): Promise<void> {
    await database.connect();
    this.app.listen(config.port, () => {
      this.log.info(`Elections backend listening on ${config.baseURL}`);
    });
    this.registerShutdownHandlers();
  }

  async stop(): Promise<void> {
    this.log.info("Shutting down elections backend");
    await this.app.stop();
    if (this.directory instanceof PgAuthDirectory) {
      await this.directory.close();
    }
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

const server = new BackendServer();

if (import.meta.main) {
  await server.start();
}

export { server };
