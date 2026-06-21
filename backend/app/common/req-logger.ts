import { Elysia } from "elysia";
import { Logger } from "@tora-chain/be-common/logging";

const logger = new Logger({ name: "backend.requests" });

export const reqLogger = new Elysia({ name: "req-logger" })
  .derive({ as: "global" }, () => ({ _reqStart: Date.now() }))
  .onAfterResponse({ as: "global" }, ({ request, set, _reqStart }) => {
    const method = request.method;
    const path = new URL(request.url).pathname;
    const status = set.status ?? 200;
    const ms = Date.now() - _reqStart;
    logger.info(`${method} - ${path} - ${status} - ${ms}ms`);
  });
