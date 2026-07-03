import express from "express";
import { randomUUID } from "node:crypto";
import type { Message, Subscription } from "@google-cloud/pubsub";
import {
  ALL_ELECTIONS,
  TOPICS,
  newBlockFilter,
  type SerializedBlock,
  type NewBlockPayload,
} from "@tora-chain/specs";
import { JsonBlockStore } from "../storage/json-store.ts";
import { hexToBigInt, computeBlockHash } from "../chain/hash-bridge.ts";
import { serveViewer } from "../web/viewer.ts";
import { ensureTopic, ensureSubscription } from "../pubsub/client.ts";

const MASTER_RETRY_DELAY_MS = 2_000;

// A worker is a pure subscriber: it syncs the existing chain from the master
// over HTTP, then subscribes to NEW_BLOCK and only receives. It re-hashes each
// block locally and rejects mismatches, but never publishes anything back.
export class WorkerNode {
  readonly nodeId: string;
  private readonly store: JsonBlockStore;
  private connected = false;

  private newBlockSub!: Subscription;

  constructor(
    private readonly port: number,
    private readonly masterUrl: string,
    private readonly electionId: string = ALL_ELECTIONS,
    dbPath?: string,
  ) {
    this.nodeId = `worker-${randomUUID().slice(0, 8)}`;
    this.store = new JsonBlockStore(dbPath ?? `chain-worker-${port}.json`);
  }

  async start(): Promise<void> {
    await this.store.init();
    this.startViewer();

    console.log(
      `[worker] ${this.nodeId} subscribing to "${this.electionId}" (master: ${this.masterUrl})`,
    );

    await this.syncFromMaster();
    await this.connectPubSub();
    this.connected = true;

    console.log(`[worker] ${this.nodeId} ready`);
  }

  async stop(): Promise<void> {
    await Promise.allSettled([this.newBlockSub?.delete()]);
  }

  // Local viewer so anyone running a node can watch the chain in a browser.
  private startViewer(): void {
    const app = express();
    serveViewer(app);

    app.get("/api/status", async (_req, res) => {
      res.json({
        nodeId: this.nodeId,
        role: "worker",
        electionId: this.electionId,
        masterUrl: this.masterUrl,
        connected: this.connected,
        blockCount: await this.store.count(),
      });
    });

    app.get("/api/chain", async (_req, res) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.json({ blocks: await this.store.getAll() });
    });

    app.listen(this.port, () => {
      console.log(
        `[worker] ${this.nodeId} viewer at http://localhost:${this.port}`,
      );
    });
  }

  // Pull the current chain state over HTTP before joining the pub/sub, since
  // Pub/Sub only delivers blocks committed from here on. Retries
  // indefinitely — in local dev the master and its workers usually start
  // concurrently, so the master's REST API may not be up yet.
  private async syncFromMaster(): Promise<void> {
    const url = new URL("/api/chain", this.masterUrl);
    if (this.electionId !== ALL_ELECTIONS) {
      url.searchParams.set("electionId", this.electionId);
    }

    for (;;) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { blocks } = (await res.json()) as { blocks: SerializedBlock[] };
        await this.syncChain(blocks);
        return;
      } catch {
        console.log(
          `[worker] ${this.nodeId} master not reachable yet, retrying in ${MASTER_RETRY_DELAY_MS}ms…`,
        );
        await new Promise((r) => setTimeout(r, MASTER_RETRY_DELAY_MS));
      }
    }
  }

  private async connectPubSub(): Promise<void> {
    const newBlockTopic = await ensureTopic(TOPICS.NEW_BLOCK);

    this.newBlockSub = await ensureSubscription(
      newBlockTopic,
      `${TOPICS.NEW_BLOCK}-worker-${this.nodeId}`,
      { filter: newBlockFilter(this.electionId) },
    );
    this.newBlockSub.on("message", (message: Message) => {
      const payload = JSON.parse(message.data.toString()) as NewBlockPayload;
      void this.handleNewBlock(payload).finally(() => message.ack());
    });
    this.newBlockSub.on("error", (err) =>
      console.error(
        `[worker] ${this.nodeId} new-block subscription error:`,
        err,
      ),
    );
  }

  private expectedHash(block: SerializedBlock): string {
    return computeBlockHash(
      block.index,
      BigInt(block.data.voter),
      // commitment is a hex string — pass it verbatim (never through BigInt,
      // which would throw on non-0x hex and drop leading zeros).
      block.data.commitment,
      block.timestamp,
      hexToBigInt(block.prevHash),
    ).toString(16);
  }

  private isValid(block: SerializedBlock): boolean {
    if (block.index === 0) return block.hash === "0"; // genesis
    try {
      return this.expectedHash(block) === block.hash;
    } catch {
      return false;
    }
  }

  private async syncChain(blocks: SerializedBlock[]): Promise<void> {
    let synced = 0;
    for (const block of blocks) {
      if (!this.isValid(block)) {
        console.error(
          `[worker] Sync: invalid hash for block ${block.index} of ${block.electionId} — skipping`,
        );
        continue;
      }
      await this.store.append(block);
      synced++;
    }

    if (synced > 0) {
      console.log(
        `[worker] ${this.nodeId} synced ${synced} blocks from master`,
      );
    }
    console.log(
      `[worker] ${this.nodeId} chain ready: ${await this.store.count()} blocks`,
    );
  }

  // Published block received from the subscription: verify, then persist.
  private async handleNewBlock(payload: NewBlockPayload): Promise<void> {
    if (!this.isValid(payload)) {
      console.error(
        `[worker] ${this.nodeId} received block ${payload.index} of ${payload.electionId} with unexpected hash — rejected`,
      );
      return;
    }

    await this.store.append(payload);
    console.log(
      `[worker] ${this.nodeId} wrote block ${payload.index} (hash=${payload.hash.slice(0, 12)}…)`,
    );
  }
}
