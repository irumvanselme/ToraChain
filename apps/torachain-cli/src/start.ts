import { parseArgs } from "node:util";
import { ALL_ELECTIONS } from "@tora-chain/specs";
import { MasterNode } from "./node/master-node.ts";
import { WorkerNode } from "./node/worker-node.ts";
import { JsonBlockStore } from "./storage/json-store.ts";
import { PostgresBlockStore } from "./storage/pg-store.ts";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    master: { type: "boolean", default: false },
    port: { type: "string", default: "7100" },
    "master-url": { type: "string" },
    election: { type: "string" },
    "db-path": { type: "string" },
  },
  strict: true,
  allowPositionals: false,
});

const port = parseInt(values["port"] ?? "7100", 10);
if (isNaN(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${values["port"]}`);
  process.exit(1);
}

// Runs `stop()` on SIGINT/SIGTERM so a node cleans up its Pub/Sub
// subscriptions (workers) or streaming pulls (master) instead of just dying.
function registerShutdown(stop: () => Promise<void>): void {
  const shutdown = async () => {
    await stop();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

if (values["master"]) {
  const dbUri = process.env["CHAIN_DB_URI"] || undefined;
  let store;
  if (dbUri) {
    store = new PostgresBlockStore(dbUri);
  } else {
    console.warn(
      "[master] CHAIN_DB_URI is not set — persisting to a local JSON file instead of Postgres",
    );
    store = new JsonBlockStore(
      values["db-path"] ?? `chain-master-${port}.json`,
    );
  }
  const node = new MasterNode(port, store);
  await node.start();
  registerShutdown(() => node.stop());
} else {
  const masterUrl = values["master-url"];
  if (!masterUrl) {
    console.error(
      "Worker nodes require --master-url (e.g. --master-url http://localhost:7100)",
    );
    process.exit(1);
  }
  const node = new WorkerNode(
    port,
    masterUrl,
    values["election"] ?? ALL_ELECTIONS,
    values["db-path"],
  );
  await node.start();
  registerShutdown(() => node.stop());
}
