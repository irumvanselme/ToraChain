import { io as connectSocket, type Socket } from "socket.io-client";
import { randomUUID } from "node:crypto";
import {
  SOCKET_EVENTS,
  TRACABILITY_EVENTS,
  type SerializedBlock,
  type ValidateBlockPayload,
  type NewBlockPayload,
  type SyncResponsePayload,
  type PeerListPayload,
  type ServerToClientEvents,
  type ClientToServerEvents,
} from "@tora-chain/specs";
import { ElectionBlock, ElectionsBlockData } from "@tora-chain/blockchain";
import { BlockStore } from "../storage/block-store.ts";
import { TracabilityReporter } from "../tracing/reporter.ts";

export class WorkerNode {
  readonly nodeId: string;
  private readonly store: BlockStore;
  private readonly reporter: TracabilityReporter;
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
    null;

  constructor(
    private readonly port: number,
    private readonly masterUrl: string,
    dbPath?: string,
  ) {
    this.nodeId = `worker-${randomUUID().slice(0, 8)}`;
    this.store = new BlockStore(dbPath ?? `chain-worker-${port}.sqlite`);
    this.reporter = new TracabilityReporter();
  }

  start(): void {
    console.log(
      `[worker] ${this.nodeId} connecting to master at ${this.masterUrl}`,
    );

    this.socket = connectSocket(this.masterUrl, {
      query: { nodeId: this.nodeId, port: String(this.port) },
      reconnection: true,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      console.log(`[worker] ${this.nodeId} connected to master`);
      // Request chain sync immediately on connect
      this.socket!.emit(SOCKET_EVENTS.SYNC_REQUEST, {});
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`[worker] ${this.nodeId} disconnected: ${reason}`);
    });

    this.socket.on(
      SOCKET_EVENTS.SYNC_RESPONSE,
      (payload: SyncResponsePayload) => {
        this.syncChain(payload.blocks);
      },
    );

    this.socket.on(
      SOCKET_EVENTS.VALIDATE_BLOCK,
      (payload: ValidateBlockPayload) => {
        this.handleValidate(payload);
      },
    );

    this.socket.on(SOCKET_EVENTS.NEW_BLOCK, (payload: NewBlockPayload) => {
      this.handleNewBlock(payload);
    });

    this.socket.on(SOCKET_EVENTS.PEER_LIST, (payload: PeerListPayload) => {
      console.log(
        `[worker] Peer list updated: ${payload.peers.map((p) => p.nodeId).join(", ")}`,
      );
    });
  }

  private syncChain(blocks: SerializedBlock[]): void {
    const localBlocks = this.store.getAll();
    const localIndexes = new Set(localBlocks.map((b) => b.index));

    let synced = 0;
    for (const block of blocks) {
      if (localIndexes.has(block.index)) continue;
      if (block.index === 0) {
        // Genesis block — accept as-is
        this.store.append(block);
        synced++;
        continue;
      }
      if (this.validateBlock(block)) {
        this.store.append(block);
        synced++;
      } else {
        console.warn(
          `[worker] Sync: invalid block at index ${block.index}, skipping`,
        );
      }
    }

    if (synced > 0) {
      console.log(
        `[worker] ${this.nodeId} synced ${synced} blocks from master`,
      );
    }

    const count = this.store.count();
    console.log(`[worker] ${this.nodeId} chain ready: ${count} blocks`);
  }

  private validateBlock(block: SerializedBlock): boolean {
    try {
      const voterBigInt = BigInt(block.data.voter);
      const candidateBigInt = BigInt(block.data.candidate);
      const prevHashBigInt = BigInt(
        block.prevHash === "0" ? 0 : "0x" + block.prevHash,
      );
      const elBlock = new ElectionBlock(
        block.index,
        new ElectionsBlockData(voterBigInt, candidateBigInt),
        block.timestamp,
        prevHashBigInt,
      );
      const computedHash = elBlock.hash.toString(16);
      return computedHash === block.hash;
    } catch {
      return false;
    }
  }

  private handleValidate(payload: ValidateBlockPayload): void {
    console.log(`[worker] ${this.nodeId} validating block ${payload.index}`);

    try {
      const voterBigInt = BigInt(payload.data.voter);
      const candidateBigInt = BigInt(payload.data.candidate);
      const prevHashBigInt = BigInt(
        payload.prevHash === "0" ? 0 : "0x" + payload.prevHash,
      );

      const elBlock = new ElectionBlock(
        payload.index,
        new ElectionsBlockData(voterBigInt, candidateBigInt),
        payload.timestamp,
        prevHashBigInt,
      );

      const hash = elBlock.hash.toString(16);

      this.socket!.emit(SOCKET_EVENTS.BLOCK_VALIDATED, {
        nodeId: this.nodeId,
        hash,
        index: payload.index,
      });

      console.log(
        `[worker] ${this.nodeId} responded hash=${hash.slice(0, 12)}...`,
      );
    } catch (err) {
      console.error(`[worker] ${this.nodeId} failed to validate block:`, err);
    }
  }

  private handleNewBlock(payload: NewBlockPayload): void {
    if (!this.validateBlock(payload)) {
      console.warn(
        `[worker] ${this.nodeId} received NEW_BLOCK ${payload.index} but hash mismatch — skipping`,
      );
      return;
    }

    this.store.append(payload);
    console.log(
      `[worker] ${this.nodeId} wrote block ${payload.index} (hash=${payload.hash.slice(0, 12)}...)`,
    );

    this.socket!.emit(SOCKET_EVENTS.BLOCK_WRITTEN, {
      nodeId: this.nodeId,
      index: payload.index,
    });

    this.reporter.emit({
      type: TRACABILITY_EVENTS.BLOCK_WRITTEN,
      nodeId: this.nodeId,
      blockIndex: payload.index,
      writtenAt: Date.now(),
    });
  }

  stop(): void {
    this.socket?.disconnect();
    this.store.close();
  }
}
