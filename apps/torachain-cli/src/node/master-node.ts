import express from "express";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import type { Topic } from "@google-cloud/pubsub";
import { TOPICS, type SerializedBlock } from "@tora-chain/specs";
import {
  BlockChain,
  idToBigInt,
  type ElectionBlock,
  type IBlockChainStorageService,
} from "../blockchain/index.ts";
import { ensureTopic } from "../pubsub/client.ts";
import { serveViewer } from "../web/viewer.ts";
import { SerialQueue } from "./serial-queue.ts";

interface VoteInput {
  electionId: string;
  votingNumber: string;
  // SHA-256 hex commitment to the voter's encrypted ballot record. Anchored
  // verbatim on-chain; opaque so it does not leak the (small) candidate set.
  commitment: string;
}

// The master is the sole publisher: on each vote it appends a block to that
// election's BlockChain — which builds, hashes and persists it — and publishes
// the result to the NEW_BLOCK topic. Workers subscribe and only receive; there
// is no consensus round or quorum requirement.
export class MasterNode {
  readonly nodeId: string;

  private newBlockTopic!: Topic;
  private httpServer: Server | null = null;

  // One in-memory chain per election, loaded from storage on first use.
  // Promises are cached rather than chains so two concurrent first votes for
  // the same election share a single load.
  private readonly chains = new Map<string, Promise<BlockChain>>();

  // Votes are committed one at a time so concurrent votes for the same
  // election can't both build on the same latest block.
  private readonly votes = new SerialQueue();

  constructor(
    private readonly port: number,
    private readonly storage: IBlockChainStorageService,
  ) {
    this.nodeId = `master-${randomUUID().slice(0, 8)}`;
  }

  async start(): Promise<void> {
    await this.storage.init();
    await this.connectPubSub();

    const app = express();
    app.use(express.json());
    serveViewer(app);

    // ── REST endpoints ────────────────────────────────────────────────────────

    app.post("/api/vote", async (req, res) => {
      const body = req.body as Partial<VoteInput>;
      const { electionId, votingNumber, commitment } = body;

      if (!electionId || !votingNumber || !commitment) {
        res
          .status(400)
          .json({ error: "Missing electionId, votingNumber, or commitment" });
        return;
      }

      try {
        const block = await this.votes.run(() =>
          this.commit({ electionId, votingNumber, commitment }),
        );
        res
          .status(202)
          .json({ accepted: true, blockIndex: block.index, hash: block.hash });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to record vote";
        res.status(409).json({ error: message });
      }
    });

    app.get("/api/status", async (_req, res) => {
      res.json({
        nodeId: this.nodeId,
        role: "master",
        blockCount: await this.storage.count(),
      });
    });

    // Public, read-only chain export. CORS-open so a voter's browser can
    // independently re-fetch the on-chain commitment when verifying a vote —
    // the whole point of the chain is to be an untrusted-backend cross-check.
    app.get("/api/chain", async (req, res) => {
      res.set("Access-Control-Allow-Origin", "*");
      // Read straight from storage rather than the in-memory chains: every
      // block is persisted before it is held, so the two agree — and an
      // unknown electionId here must not spin up a chain for it.
      const electionId = req.query["electionId"];
      res.json({
        blocks: await this.storage.getAll(
          typeof electionId === "string" ? electionId : undefined,
        ),
      });
    });

    const httpServer = createServer(app);
    this.httpServer = httpServer;
    await new Promise<void>((resolve) => {
      httpServer.listen(this.port, () => {
        console.log(`[master] ${this.nodeId} listening on :${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    const httpServer = this.httpServer;
    this.httpServer = null;
    if (httpServer) {
      // Drop keep-alive connections that are just sitting there, or close()
      // would wait on browsers holding an idle viewer connection open.
      httpServer.closeIdleConnections();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    await this.storage.close();
  }

  // ── Pub/Sub wiring ───────────────────────────────────────────────────────────

  private async connectPubSub(): Promise<void> {
    this.newBlockTopic = await ensureTopic(TOPICS.NEW_BLOCK);
  }

  // Publish a committed block; the "electionId" attribute lets each worker's
  // subscription filter for just the election it cares about.
  private publish(block: ElectionBlock): void {
    const serialized = block.toJSON();
    void this.newBlockTopic.publishMessage({
      json: serialized,
      attributes: { electionId: serialized.electionId },
    });
  }

  // The election's chain, loaded once and kept in memory. Every block it
  // appends — the genesis block included — is published as a side effect.
  private chainFor(electionId: string): Promise<BlockChain> {
    let chain = this.chains.get(electionId);
    if (!chain) {
      chain = BlockChain.load(electionId, this.storage, {
        onAppend: (block) => this.publish(block),
      });
      this.chains.set(electionId, chain);
    }
    return chain;
  }

  private async commit(vote: VoteInput): Promise<SerializedBlock> {
    const chain = await this.chainFor(vote.electionId);
    const block = await chain.addBlock({
      voter: idToBigInt(vote.votingNumber),
      commitment: vote.commitment,
    });

    const serialized = block.toJSON();
    console.log(
      `[master] Committed block ${serialized.index} for ${serialized.electionId} (hash=${serialized.hash.slice(0, 12)}…)`,
    );

    return serialized;
  }
}
