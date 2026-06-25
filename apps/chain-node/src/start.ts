import { parseArgs } from "node:util";
import { MasterNode } from "./node/master-node.ts";
import { WorkerNode } from "./node/worker-node.ts";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    master: { type: "boolean", default: false },
    port: { type: "string", default: "7100" },
    "master-url": { type: "string" },
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

if (values["master"]) {
  const node = new MasterNode(port, values["db-path"]);
  node.start();
} else {
  const masterUrl = values["master-url"];
  if (!masterUrl) {
    console.error(
      "Worker nodes require --master-url (e.g. --master-url ws://localhost:7000)",
    );
    process.exit(1);
  }
  const node = new WorkerNode(port, masterUrl, values["db-path"]);
  node.start();
}
