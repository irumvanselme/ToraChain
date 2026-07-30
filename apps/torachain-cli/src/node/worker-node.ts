import express from "express";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import type { Message, Subscription } from "@google-cloud/pubsub";
import {
  ALL_ELECTIONS,
  TOPICS,
  newBlockFilter,
  type SerializedBlock,
  type NewBlockPayload,
} from "@tora-chain/specs";
import {
  BlockChain,
  type IBlockChainStorageService,
} from "../blockchain/index.ts";
import { serveViewer } from "../web/viewer.ts";
import { ensureTopic, ensureSubscription } from "../pubsub/client.ts";
import { SerialQueue } from "./serial-queue.ts";

const MASTER_RETRY_DELAY_MS = 2_000;

// A worker is a pure subscriber: it syncs the existing chain from the master
// over HTTP, then subscribes to NEW_BLOCK and only receives. Every block it is
// handed goes through the election's BlockChain, which re-hashes it locally and
// rejects mismatches. It never publishes anything back.
export class WorkerNode {
  readonly nodeId: string;
  private connected = false;

  private newBlockSub!: Subscription;
  private viewer: Server | null = null;

  // One in-memory chain per election followed (a worker on ALL_ELECTIONS
  // follows several). Promises are cached rather than chains so two blocks for
  // a new election arriving at once share a single load.
  private readonly chains = new Map<string, Promise<BlockChain>>();

  // Received blocks are taken in one at a time: appending reads the tip before
  // it writes, and pub/sub delivers concurrently.
  private readonly incoming = new SerialQueue();

  constructor(
    private readonly port: number,
    private readonly masterUrl: string,
    private readonly electionId: string,
    private readonly storage: IBlockChainStorageService,
  ) {
    this.nodeId = `worker-${randomUUID().slice(0, 8)}`;
  }

  async start(): Promise<void> {
    await this.storage.init();
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
    const viewer = this.viewer;
    this.viewer = null;
    viewer?.closeIdleConnections();
    await Promise.allSettled([
      this.newBlockSub?.delete(),
      viewer && new Promise<void>((resolve) => viewer.close(() => resolve())),
      this.storage.close(),
    ]);
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
        blockCount: await this.storage.count(),
        // Re-hashes and re-links every block this worker holds, so the viewer
        // can show that the replica still verifies end to end.
        chainsValid: await this.chainsValid(),
      });
    });

    app.get("/api/chain", async (_req, res) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.json({ blocks: await this.storage.getAll() });
    });

    this.viewer = app.listen(this.port, () => {
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
      let payload: NewBlockPayload;
      try {
        payload = JSON.parse(message.data.toString()) as NewBlockPayload;
      } catch {
        // Ack it anyway: redelivering something we cannot parse would only
        // have us fail on it again.
        console.error(
          `[worker] ${this.nodeId} received an unparsable message — dropped`,
        );
        message.ack();
        return;
      }
      void this.handleNewBlock(payload).finally(() => message.ack());
    });
    this.newBlockSub.on("error", (err) =>
      console.error(
        `[worker] ${this.nodeId} new-block subscription error:`,
        err,
      ),
    );
  }

  // The election's chain, rebuilt from this worker's own storage on first use.
  // A worker never invents a genesis block — it only replicates the master's.
  private chainFor(electionId: string): Promise<BlockChain> {
    let chain = this.chains.get(electionId);
    if (!chain) {
      chain = BlockChain.load(electionId, this.storage);
      this.chains.set(electionId, chain);
    }
    return chain;
  }

  private follows(electionId: string): boolean {
    return this.electionId === ALL_ELECTIONS || this.electionId === electionId;
  }

  private async chainsValid(): Promise<boolean> {
    const chains = await Promise.all(this.chains.values());
    return chains.every((chain) => chain.isValid());
  }

  /**
   * Hand one block to its chain, which verifies it locally before persisting.
   * Returns whether this worker's copy of the chain grew.
   */
  private async ingest(
    block: SerializedBlock,
    source: "sync" | "pubsub",
  ): Promise<boolean> {
    // Guard the one field that decides which chain a block belongs to, so a
    // junk payload can never open a chain of its own.
    if (typeof block?.electionId !== "string") {
      console.error(
        `[worker] ${this.nodeId} dropped a block with no election id from ${source}`,
      );
      return false;
    }
    if (!this.follows(block.electionId)) return false;

    const chain = await this.chainFor(block.electionId);
    const result = await this.incoming.run(() => chain.accept(block));

    switch (result.status) {
      case "appended":
        return true;
      case "out-of-order":
        // Kept: its hash checks out, and the missing parent still arrives —
        // Pub/Sub makes no ordering promise.
        console.warn(
          `[worker] ${this.nodeId} block ${block.index} of ${block.electionId} arrived before its parent`,
        );
        return true;
      case "duplicate":
        return false;
      case "rejected":
        console.error(
          `[worker] ${this.nodeId} rejected block ${block.index} of ${block.electionId} from ${source}: ${result.reason}`,
        );
        return false;
    }
  }

  private async syncChain(blocks: SerializedBlock[]): Promise<void> {
    let synced = 0;
    for (const block of blocks) {
      if (await this.ingest(block, "sync")) synced++;
    }

    if (synced > 0) {
      console.log(
        `[worker] ${this.nodeId} synced ${synced} blocks from master`,
      );
    }
    console.log(
      `[worker] ${this.nodeId} chain ready: ${await this.storage.count()} blocks`,
    );
  }

  // Published block received from the subscription: verify, then persist.
  private async handleNewBlock(payload: NewBlockPayload): Promise<void> {
    if (await this.ingest(payload, "pubsub")) {
      console.log(
        `[worker] ${this.nodeId} wrote block ${payload.index} (hash=${payload.hash.slice(0, 12)}…)`,
      );
    }
  }
}
