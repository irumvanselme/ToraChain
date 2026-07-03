import express from "express";
import { createServer } from "node:http";
import { Server as SocketServer, type Socket } from "socket.io";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import {
  ALL_ELECTIONS,
  electionTopic,
  SOCKET_EVENTS,
  type SerializedBlock,
  type ValidateBlockPayload,
  type BlockValidatedPayload,
  type SyncRequestPayload,
  type ServerToClientEvents,
  type ClientToServerEvents,
} from "@tora-chain/specs";
import type { BlockStore } from "../storage/store.ts";
import { runPbftRound } from "../consensus/pbft.ts";
import {
  idToBigInt,
  hexToBigInt,
  computeBlockHash,
} from "../chain/hash-bridge.ts";
import { serveViewer } from "../web/viewer.ts";

const MIN_NODES = 3;

interface VoteInput {
  electionId: string;
  votingNumber: string;
  candidateId: string;
}

interface Subscriber {
  nodeId: string;
  socketId: string;
  electionId: string;
  connectedAt: number;
  port?: number;
}

export class MasterNode {
  readonly nodeId: string;
  private readonly subscribers = new Map<string, Subscriber>();

  // Internal bus: routes per-socket BLOCK_VALIDATED events into active rounds
  private readonly validationBus = new EventEmitter();
  private io: SocketServer<ClientToServerEvents, ServerToClientEvents> | null =
    null;

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

    const app = express();
    app.use(express.json());
    serveViewer(app);

    // ── REST endpoints ────────────────────────────────────────────────────────

    app.post("/api/vote", async (req, res) => {
      const body = req.body as Partial<VoteInput>;
      const { electionId, votingNumber, candidateId } = body;

      if (!electionId || !votingNumber || !candidateId) {
        res
          .status(400)
          .json({ error: "Missing electionId, votingNumber, or candidateId" });
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
          this.runConsensus({ electionId, votingNumber, candidateId }),
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
        subscribers: Array.from(this.subscribers.values()).map((s) => ({
          nodeId: s.nodeId,
          electionId: s.electionId,
          port: s.port,
          connectedAt: s.connectedAt,
        })),
      });
    });

    app.get("/api/chain", async (req, res) => {
      const electionId = req.query["electionId"];
      res.json({
        blocks: await this.store.getAll(
          typeof electionId === "string" ? electionId : undefined,
        ),
      });
    });

    // ── Socket.io: pub/sub subscribers ────────────────────────────────────────

    const httpServer = createServer(app);
    this.io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(
      httpServer,
      { cors: { origin: "*" } },
    );
    this.io.on("connection", (socket) => {
      this.handleSubscriber(socket);
    });

    httpServer.listen(this.port, () => {
      console.log(`[master] ${this.nodeId} listening on :${this.port}`);
      console.log(
        `[master] Waiting for ${MIN_NODES} subscribers before accepting votes`,
      );
    });
  }

  private handleSubscriber(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  ): void {
    const query = socket.handshake.query;
    const nodeId = (query["nodeId"] as string | undefined) ?? randomUUID();
    const port = parseInt((query["port"] as string | undefined) ?? "0", 10);
    const electionId =
      (query["electionId"] as string | undefined) ?? ALL_ELECTIONS;

    socket.join(electionTopic(electionId));
    this.subscribers.set(nodeId, {
      nodeId,
      socketId: socket.id,
      electionId,
      connectedAt: Date.now(),
      port: port || undefined,
    });

    console.log(
      `[master] Subscribed: ${nodeId} → ${electionTopic(electionId)} (${this.subscribers.size} nodes total)`,
    );

    socket.on(SOCKET_EVENTS.SYNC_REQUEST, async (_p: SyncRequestPayload) => {
      const blocks = await this.store.getAll(
        electionId === ALL_ELECTIONS ? undefined : electionId,
      );
      socket.emit(SOCKET_EVENTS.SYNC_RESPONSE, { blocks });
    });

    // Route validation responses into the active consensus round
    socket.on(
      SOCKET_EVENTS.BLOCK_VALIDATED,
      (payload: BlockValidatedPayload) => {
        this.validationBus.emit("validated", payload);
      },
    );

    socket.on("disconnect", () => {
      this.subscribers.delete(nodeId);
      console.log(
        `[master] Unsubscribed: ${nodeId} (${this.subscribers.size} nodes remaining)`,
      );
    });
  }

  // Publish a committed block to its election topic (and the firehose topic).
  private publish(block: SerializedBlock): void {
    this.io!.to(electionTopic(block.electionId))
      .to(electionTopic(ALL_ELECTIONS))
      .emit(SOCKET_EVENTS.NEW_BLOCK, block);
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
      data: { voter: "0", candidate: "0" },
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
    const candidateBigInt = idToBigInt(vote.candidateId);
    const hash = computeBlockHash(
      nextIndex,
      voterBigInt,
      candidateBigInt,
      timestamp,
      hexToBigInt(latest.hash),
    ).toString(16);

    const candidate: ValidateBlockPayload = {
      index: nextIndex,
      electionId: vote.electionId,
      data: {
        voter: voterBigInt.toString(),
        candidate: candidateBigInt.toString(),
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

    // pBFT: every connected subscriber validates, regardless of topic
    this.io!.emit(SOCKET_EVENTS.VALIDATE_BLOCK, candidate);

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
