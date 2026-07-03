import express from "express";
import { io as connectSocket, type Socket } from "socket.io-client";
import { randomUUID } from "node:crypto";
import {
  ALL_ELECTIONS,
  SOCKET_EVENTS,
  type SerializedBlock,
  type ValidateBlockPayload,
  type NewBlockPayload,
  type SyncResponsePayload,
  type ServerToClientEvents,
  type ClientToServerEvents,
} from "@tora-chain/specs";
import { JsonBlockStore } from "../storage/json-store.ts";
import { hexToBigInt, computeBlockHash } from "../chain/hash-bridge.ts";
import { serveViewer } from "../web/viewer.ts";

export class WorkerNode {
  readonly nodeId: string;
  private readonly store: JsonBlockStore;
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
    null;
  private connected = false;

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
      `[worker] ${this.nodeId} subscribing to "${this.electionId}" at ${this.masterUrl}`,
    );

    this.socket = connectSocket(this.masterUrl, {
      query: {
        nodeId: this.nodeId,
        port: String(this.port),
        electionId: this.electionId,
      },
      reconnection: true,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      this.connected = true;
      console.log(`[worker] ${this.nodeId} connected to master`);
      // Request chain sync immediately on connect
      this.socket!.emit(SOCKET_EVENTS.SYNC_REQUEST, {});
    });

    this.socket.on("disconnect", (reason) => {
      this.connected = false;
      console.log(`[worker] ${this.nodeId} disconnected: ${reason}`);
    });

    this.socket.on(
      SOCKET_EVENTS.SYNC_RESPONSE,
      (payload: SyncResponsePayload) => {
        void this.syncChain(payload.blocks);
      },
    );

    this.socket.on(
      SOCKET_EVENTS.VALIDATE_BLOCK,
      (payload: ValidateBlockPayload) => {
        this.handleValidate(payload);
      },
    );

    this.socket.on(SOCKET_EVENTS.NEW_BLOCK, (payload: NewBlockPayload) => {
      void this.handleNewBlock(payload);
    });
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
      res.json({ blocks: await this.store.getAll() });
    });

    app.listen(this.port, () => {
      console.log(
        `[worker] ${this.nodeId} viewer at http://localhost:${this.port}`,
      );
    });
  }

  private expectedHash(block: ValidateBlockPayload): string {
    return computeBlockHash(
      block.index,
      BigInt(block.data.voter),
      BigInt(block.data.candidate),
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

  // pBFT: respond with the hash this node computes for the candidate block.
  private handleValidate(payload: ValidateBlockPayload): void {
    console.log(`[worker] ${this.nodeId} validating block ${payload.index}`);

    try {
      const hash = this.expectedHash(payload);
      this.socket!.emit(SOCKET_EVENTS.BLOCK_VALIDATED, {
        nodeId: this.nodeId,
        hash,
        index: payload.index,
      });
      console.log(
        `[worker] ${this.nodeId} responded hash=${hash.slice(0, 12)}…`,
      );
    } catch (err) {
      console.error(`[worker] ${this.nodeId} failed to validate block:`, err);
    }
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

  stop(): void {
    this.socket?.disconnect();
  }
}
