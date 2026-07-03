import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Express } from "express";

const html = readFileSync(join(import.meta.dirname, "index.html"), "utf8");

// Mounts the static chain viewer (plain HTML/CSS) at the node's root URL.
// It reads /api/status and /api/chain, which both node roles expose.
export function serveViewer(app: Express): void {
  app.get("/", (_req, res) => {
    res.type("html").send(html);
  });
}
