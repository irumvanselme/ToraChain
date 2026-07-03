import express from "express";
import { createServer } from "node:http";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { Message, Subscription, Topic } from "@google-cloud/pubsub";
import {
  TOPICS,
  MASTER_SUBSCRIPTIONS,
  type SerializedBlock,
  type ValidateBlockPayload,
  type BlockValidatedPayload,
  type WorkerPresencePayload,
} from "@tora-chain/specs";
import type { BlockStore } from "../storage/store.ts";
import { runPbftRound } from "../consensus/pbft.ts";
import { ensureTopic, ensureSubscription } from "../pubsub/client.ts";
import {
  idToBigInt,
  hexToBigInt,
  computeBlockHash,
} from "../chain/hash-bridge.ts";
import { serveViewer } from "../web/viewer.ts";

const MIN_NODES = 3;

// A worker is considered live if we've heard a heartbeat within the last
// three intervals; stale entries are swept out on the same cadence.
const PRESENCE_HEARTBEAT_MS = 5_000;
const PRESENCE_TTL_MS = PRESENCE_HEARTBEAT_MS * 3;

interface VoteInput {
  electionId: string;
  votingNumber: string;
  // SHA-256 hex commitment to the voter's encrypted ballot record. Anchored
  // verbatim on-chain; opaque so it does not leak the (small) candidate set.
  commitment: string;
}

interface Subscriber extends WorkerPresencePayload {
  lastSeenAt: number;
}

export class MasterNode {
  readonly nodeId: string;
  private readonly subscribers = new Map<string, Subscriber>();

  // Internal bus: routes BLOCK_VALIDATED messages into active pBFT rounds
  private readonly validationBus = new EventEmitter();

  private newBlockTopic!: Topic;
  private validateBlockTopic!: Topic;
  private blockValidatedSub!: Subscription;
  private presenceSub!: Subscription;
  private presenceSweep!: ReturnType<typeof setInterval>;

  // Consensus rounds run one at a time so concurrent votes for the same
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

      const nodeCount = this.subscribers.size;
      if (nodeCount < MIN_NODES) {
        res.status(503).json({
          error: `Quorum not met. Need ${MIN_NODES} subscriber nodes, have ${nodeCount}.`,
        });
        return;
      }

      try {
        const block = await this.enqueue(() =>
          this.runConsensus({ electionId, votingNumber, commitment }),
        );
        res
          .status(202)
          .json({ accepted: true, blockIndex: block.index, hash: block.hash });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Consensus failed";
        res.status(409).json({ error: message });
      }
    });

    app.get("/api/status", async (_req, res) => {
      res.json({
        nodeId: this.nodeId,
        role: "master",
        connectedNodes: this.subscribers.size,
        blockCount: await this.store.count(),
        ready: this.subscribers.size >= MIN_NODES,
        subscribers: Array.from(this.subscribers.values()),
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
      console.log(
        `[master] Waiting for ${MIN_NODES} subscribers before accepting votes`,
      );
    });
  }

  async stop(): Promise<void> {
    clearInterval(this.presenceSweep);
    await Promise.allSettled([
      this.blockValidatedSub?.close(),
      this.presenceSub?.close(),
    ]);
    await this.store.close();
  }

  // ── Pub/Sub wiring ───────────────────────────────────────────────────────────

  private async connectPubSub(): Promise<void> {
    this.newBlockTopic = await ensureTopic(TOPICS.NEW_BLOCK);
    this.validateBlockTopic = await ensureTopic(TOPICS.VALIDATE_BLOCK);
    const blockValidatedTopic = await ensureTopic(TOPICS.BLOCK_VALIDATED);
    const presenceTopic = await ensureTopic(TOPICS.WORKER_PRESENCE);

    this.blockValidatedSub = await ensureSubscription(
      blockValidatedTopic,
      MASTER_SUBSCRIPTIONS.BLOCK_VALIDATED,
      { neverExpire: true },
    );
    this.blockValidatedSub.on("message", (message: Message) => {
      const payload = JSON.parse(
        message.data.toString(),
      ) as BlockValidatedPayload;
      this.validationBus.emit("validated", payload);
      message.ack();
    });
    this.blockValidatedSub.on("error", (err) =>
      console.error("[master] block-validated subscription error:", err),
    );

    this.presenceSub = await ensureSubscription(
      presenceTopic,
      MASTER_SUBSCRIPTIONS.WORKER_PRESENCE,
      { neverExpire: true },
    );
    this.presenceSub.on("message", (message: Message) => {
      const payload = JSON.parse(
        message.data.toString(),
      ) as WorkerPresencePayload;
      const isNew = !this.subscribers.has(payload.nodeId);
      this.subscribers.set(payload.nodeId, {
        ...payload,
        lastSeenAt: Date.now(),
      });
      if (isNew) {
        console.log(
          `[master] Subscribed: ${payload.nodeId} → ${payload.electionId} (${this.subscribers.size} nodes total)`,
        );
      }
      message.ack();
    });
    this.presenceSub.on("error", (err) =>
      console.error("[master] presence subscription error:", err),
    );

    this.presenceSweep = setInterval(
      () => this.pruneStaleSubscribers(),
      PRESENCE_HEARTBEAT_MS,
    );
  }

  private pruneStaleSubscribers(): void {
    const cutoff = Date.now() - PRESENCE_TTL_MS;
    for (const [nodeId, subscriber] of this.subscribers) {
      if (subscriber.lastSeenAt < cutoff) {
        this.subscribers.delete(nodeId);
        console.log(
          `[master] Unsubscribed: ${nodeId} (${this.subscribers.size} nodes remaining)`,
        );
      }
    }
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

  private async runConsensus(vote: VoteInput): Promise<SerializedBlock> {
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

    const candidate: ValidateBlockPayload = {
      index: nextIndex,
      electionId: vote.electionId,
      data: {
        voter: voterBigInt.toString(),
        commitment: vote.commitment,
      },
      timestamp,
      prevHash: latest.hash,
    };

    const { round, promise } = runPbftRound(this.subscribers.size);

    // Route validation responses for this block index into the round
    const handler = (payload: BlockValidatedPayload) => {
      if (payload.index === nextIndex) round.collect(payload);
    };
    this.validationBus.on("validated", handler);

    // pBFT: every live subscriber validates, regardless of the election it's
    // subscribed to — consensus needs all available validators to weigh in.
    await this.validateBlockTopic.publishMessage({ json: candidate });

    const result = await promise;
    this.validationBus.off("validated", handler);

    if (!result.reached) {
      throw new Error(`Consensus failed for block ${nextIndex}: no quorum`);
    }
    if (result.agreedHash !== hash) {
      throw new Error(
        `Consensus failed for block ${nextIndex}: quorum hash disagrees with master`,
      );
    }

    const committed: SerializedBlock = { ...candidate, hash };
    await this.store.append(committed);
    this.publish(committed);

    console.log(
      `[master] Committed block ${committed.index} for ${committed.electionId} (hash=${committed.hash.slice(0, 12)}…)`,
    );

    return committed;
  }
}
