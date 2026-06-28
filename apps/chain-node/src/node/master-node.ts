import express from "express";
import { createServer } from "node:http";
import { Server as SocketServer, type Socket } from "socket.io";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import {
  SOCKET_EVENTS,
  TRACABILITY_EVENTS,
  type SerializedBlock,
  type ValidateBlockPayload,
  type BlockValidatedPayload,
  type BlockWrittenPayload,
  type SyncRequestPayload,
  type ServerToClientEvents,
  type ClientToServerEvents,
} from "@tora-chain/specs";
import { BlockStore } from "../storage/block-store.ts";
import { TracabilityReporter } from "../tracing/reporter.ts";
import { runPbftRound } from "../consensus/pbft.ts";
import { idToBigInt, computeBlockHash } from "../chain/hash-bridge.ts";

const MIN_NODES = 3;

interface VoteInput {
  electionId: string;
  votingNumber: string;
  candidateId: string;
}

interface ConnectedNode {
  nodeId: string;
  socketId: string;
  connectedAt: number;
  port?: number;
}

export class MasterNode {
  readonly nodeId: string;
  private readonly store: BlockStore;
  private readonly reporter: TracabilityReporter;
  private readonly connectedNodes = new Map<string, ConnectedNode>();

  // Internal bus: routes per-socket BLOCK_VALIDATED events into active rounds
  private readonly validationBus = new EventEmitter();
  private io: SocketServer<ClientToServerEvents, ServerToClientEvents> | null =
    null;

  constructor(
    private readonly port: number,
    dbPath?: string,
  ) {
    this.nodeId = `master-${randomUUID().slice(0, 8)}`;
    this.store = new BlockStore(dbPath ?? `chain-master-${port}.sqlite`);
    this.reporter = new TracabilityReporter();
    this.ensureGenesisBlock();
  }

  private ensureGenesisBlock(): void {
    if (this.store.count() === 0) {
      const genesis: SerializedBlock = {
        index: 0,
        electionId: "genesis",
        data: { voter: "0", candidate: "0" },
        timestamp: Date.now(),
        prevHash: "0",
        hash: "0",
      };
      this.store.append(genesis);
    }
  }

  start(): void {
    const app = express();
    app.use(express.json());

    const httpServer = createServer(app);
    this.io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(
      httpServer,
      { cors: { origin: "*" } },
    );

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

      const nodeCount = this.connectedNodes.size;
      if (nodeCount < MIN_NODES) {
        res.status(503).json({
          error: `Quorum not met. Need ${MIN_NODES} worker nodes, have ${nodeCount}.`,
        });
        return;
      }

      this.reporter.emit({
        type: TRACABILITY_EVENTS.VOTE_RECEIVED,
        electionId,
        votingNumber,
        candidateId,
        receivedAt: Date.now(),
      });

      try {
        const block = await this.runConsensus({
          electionId,
          votingNumber,
          candidateId,
        });
        res
          .status(202)
          .json({ accepted: true, blockIndex: block.index, hash: block.hash });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Consensus failed";
        res.status(409).json({ error: message });
      }
    });

    app.get("/api/status", (_req, res) => {
      res.json({
        nodeId: this.nodeId,
        role: "master",
        connectedNodes: this.connectedNodes.size,
        blockCount: this.store.count(),
        ready: this.connectedNodes.size >= MIN_NODES,
      });
    });

    app.get("/api/chain", (_req, res) => {
      res.json({ blocks: this.store.getAll() });
    });

    // Tracability can call this to get current peer topology without waiting for events
    app.get("/api/peers", (_req, res) => {
      const peers = Array.from(this.connectedNodes.values()).map((n) => ({
        nodeId: n.nodeId,
        port: n.port ?? this.port,
        connectedAt: n.connectedAt,
      }));
      res.json({ peers, masterNodeId: this.nodeId, masterPort: this.port });
    });

    // ── Socket.io: peer connections ───────────────────────────────────────────

    this.io.on("connection", (socket) => {
      this.handlePeerConnect(socket);
    });

    httpServer.listen(this.port, () => {
      console.log(`[master] ${this.nodeId} listening on :${this.port}`);
      console.log(
        `[master] Waiting for ${MIN_NODES} workers before accepting votes`,
      );
    });

    // Re-announce all connected nodes every 8 s so tracability catches up
    // even if it started after the initial node_connected events fired.
    setInterval(() => {
      for (const node of this.connectedNodes.values()) {
        this.reporter.emit({
          type: TRACABILITY_EVENTS.NODE_CONNECTED,
          nodeId: node.nodeId,
          port: node.port ?? this.port,
          connectedAt: node.connectedAt,
        });
      }
    }, 8_000);
  }

  private handlePeerConnect(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  ): void {
    const nodeId =
      (socket.handshake.query["nodeId"] as string | undefined) ?? randomUUID();
    const port = parseInt(
      (socket.handshake.query["port"] as string | undefined) ?? "0",
      10,
    );

    const peer: ConnectedNode = {
      nodeId,
      socketId: socket.id,
      connectedAt: Date.now(),
      port: port || undefined,
    };
    this.connectedNodes.set(nodeId, peer);

    console.log(
      `[master] Connected: ${nodeId} (${this.connectedNodes.size} nodes total)`,
    );

    this.reporter.emit({
      type: TRACABILITY_EVENTS.NODE_CONNECTED,
      nodeId,
      port: port || this.port,
      connectedAt: peer.connectedAt,
    });

    this.broadcastPeerList();

    socket.on(SOCKET_EVENTS.SYNC_REQUEST, (_p: SyncRequestPayload) => {
      socket.emit(SOCKET_EVENTS.SYNC_RESPONSE, { blocks: this.store.getAll() });
    });

    // Route validated responses into the active consensus round
    socket.on(
      SOCKET_EVENTS.BLOCK_VALIDATED,
      (payload: BlockValidatedPayload) => {
        this.validationBus.emit("validated", payload);
        this.reporter.emit({
          type: TRACABILITY_EVENTS.BLOCK_VALIDATED,
          nodeId: payload.nodeId,
          blockIndex: payload.index,
          hash: payload.hash,
          validatedAt: Date.now(),
        });
      },
    );

    socket.on(SOCKET_EVENTS.BLOCK_WRITTEN, (payload: BlockWrittenPayload) => {
      this.reporter.emit({
        type: TRACABILITY_EVENTS.BLOCK_WRITTEN,
        nodeId: payload.nodeId,
        blockIndex: payload.index,
        writtenAt: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      this.connectedNodes.delete(nodeId);
      console.log(
        `[master] Disconnected: ${nodeId} (${this.connectedNodes.size} nodes remaining)`,
      );
      this.reporter.emit({
        type: TRACABILITY_EVENTS.NODE_DISCONNECTED,
        nodeId,
        disconnectedAt: Date.now(),
      });
      this.broadcastPeerList();
    });
  }

  private broadcastPeerList(): void {
    if (!this.io) return;
    const peers = Array.from(this.connectedNodes.values()).map((n) => ({
      nodeId: n.nodeId,
      connectedAt: n.connectedAt,
    }));
    this.io.emit(SOCKET_EVENTS.PEER_LIST, { peers });
  }

  private async runConsensus(vote: VoteInput): Promise<SerializedBlock> {
    const latest = this.store.getLatest()!;
    const nextIndex = latest.index + 1;
    const timestamp = Date.now();

    const voterBigInt = idToBigInt(vote.votingNumber);
    const candidateBigInt = idToBigInt(vote.candidateId);
    const prevHashBigInt = BigInt(latest.hash === "0" ? 0 : "0x" + latest.hash);

    const hashBigInt = computeBlockHash(
      nextIndex,
      voterBigInt,
      candidateBigInt,
      timestamp,
      prevHashBigInt,
    );

    const candidate: ValidateBlockPayload = {
      index: nextIndex,
      electionId: vote.electionId,
      data: {
        voter: voterBigInt.toString(),
        candidate: candidateBigInt.toString(),
      },
      timestamp,
      prevHash: prevHashBigInt.toString(),
    };

    const targetNodeIds = Array.from(this.connectedNodes.keys());

    this.reporter.emit({
      type: TRACABILITY_EVENTS.VALIDATE_BLOCK_SENT,
      blockIndex: nextIndex,
      electionId: vote.electionId,
      targetNodeIds,
      sentAt: Date.now(),
    });

    const { round, promise } = runPbftRound(this.connectedNodes.size);

    // Route validation responses for this block index into the round
    const handler = (payload: BlockValidatedPayload) => {
      if (payload.index === nextIndex) round.collect(payload);
    };
    this.validationBus.on("validated", handler);

    // Broadcast to all workers
    this.io!.emit(SOCKET_EVENTS.VALIDATE_BLOCK, candidate);

    const result = await promise;
    this.validationBus.off("validated", handler);

    if (!result.reached) {
      this.reporter.emit({
        type: TRACABILITY_EVENTS.CONSENSUS_FAILED,
        blockIndex: nextIndex,
        reason: "No quorum",
        responses: result.allResponses,
        failedAt: Date.now(),
      });
      throw new Error(`Consensus failed for block ${nextIndex}: no quorum`);
    }

    this.reporter.emit({
      type: TRACABILITY_EVENTS.CONSENSUS_REACHED,
      blockIndex: nextIndex,
      agreedHash: result.agreedHash!,
      agreeingNodeIds: result.agreeingNodes,
      reachedAt: Date.now(),
    });

    const committed: SerializedBlock = {
      ...candidate,
      hash: hashBigInt.toString(16),
    };

    this.store.append(committed);

    this.reporter.emit({
      type: TRACABILITY_EVENTS.NEW_BLOCK_BROADCAST,
      blockIndex: committed.index,
      hash: committed.hash,
      broadcastAt: Date.now(),
    });

    this.io!.emit(SOCKET_EVENTS.NEW_BLOCK, committed);

    return committed;
  }
}
