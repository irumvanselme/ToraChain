import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import type { Topic } from "@google-cloud/pubsub";
import { TOPICS, type SerializedBlock } from "@tora-chain/specs";
import type { BlockStore } from "../storage/store.ts";
import { ensureTopic } from "../pubsub/client.ts";
import {
  idToBigInt,
  hexToBigInt,
  computeBlockHash,
} from "../chain/hash-bridge.ts";
import { serveViewer } from "../web/viewer.ts";

interface VoteInput {
  electionId: string;
  votingNumber: string;
  // SHA-256 hex commitment to the voter's encrypted ballot record. Anchored
  // verbatim on-chain; opaque so it does not leak the (small) candidate set.
  commitment: string;
}

// The master is the sole publisher: on each vote it builds the next block,
// persists it, and publishes it to the NEW_BLOCK topic. Workers subscribe and
// only receive — there is no consensus round or quorum requirement.
export class MasterNode {
  readonly nodeId: string;

  private newBlockTopic!: Topic;

  // Votes are committed one at a time so concurrent votes for the same
  // election can't both build on the same latest block.
  private voteQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly port: number,
    private readonly store: BlockStore,
  ) {
    this.nodeId = `master-${randomUUID().slice(0, 8)}`;
  }

  async start(): Promise<void> {
    await this.store.init();
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
        const block = await this.enqueue(() =>
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
        blockCount: await this.store.count(),
      });
    });

    // Public, read-only chain export. CORS-open so a voter's browser can
    // independently re-fetch the on-chain commitment when verifying a vote —
    // the whole point of the chain is to be an untrusted-backend cross-check.
    app.get("/api/chain", async (req, res) => {
      res.set("Access-Control-Allow-Origin", "*");
      const electionId = req.query["electionId"];
      res.json({
        blocks: await this.store.getAll(
          typeof electionId === "string" ? electionId : undefined,
        ),
      });
    });

    const httpServer = createServer(app);
    httpServer.listen(this.port, () => {
      console.log(`[master] ${this.nodeId} listening on :${this.port}`);
    });
  }

  async stop(): Promise<void> {
    await this.store.close();
  }

  // ── Pub/Sub wiring ───────────────────────────────────────────────────────────

  private async connectPubSub(): Promise<void> {
    this.newBlockTopic = await ensureTopic(TOPICS.NEW_BLOCK);
  }

  // Publish a committed block; the "electionId" attribute lets each worker's
  // subscription filter for just the election it cares about.
  private publish(block: SerializedBlock): void {
    void this.newBlockTopic.publishMessage({
      json: block,
      attributes: { electionId: block.electionId },
    });
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const result = this.voteQueue.then(job, job);
    this.voteQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async ensureGenesis(electionId: string): Promise<SerializedBlock> {
    const latest = await this.store.getLatest(electionId);
    if (latest) return latest;

    const genesis: SerializedBlock = {
      index: 0,
      electionId,
      data: { voter: "0", commitment: "0" },
      timestamp: Date.now(),
      prevHash: "0",
      hash: "0",
    };
    await this.store.append(genesis);
    this.publish(genesis);
    return genesis;
  }

  private async commit(vote: VoteInput): Promise<SerializedBlock> {
    const latest = await this.ensureGenesis(vote.electionId);
    const nextIndex = latest.index + 1;
    const timestamp = Date.now();

    const voterBigInt = idToBigInt(vote.votingNumber);
    const hash = computeBlockHash(
      nextIndex,
      voterBigInt,
      vote.commitment,
      timestamp,
      hexToBigInt(latest.hash),
    ).toString(16);

    const block: SerializedBlock = {
      index: nextIndex,
      electionId: vote.electionId,
      data: {
        voter: voterBigInt.toString(),
        commitment: vote.commitment,
      },
      timestamp,
      prevHash: latest.hash,
      hash,
    };

    await this.store.append(block);
    this.publish(block);

    console.log(
      `[master] Committed block ${block.index} for ${block.electionId} (hash=${block.hash.slice(0, 12)}…)`,
    );

    return block;
  }
}
