// Canonical socket.io event names for the chain-node peer protocol.
// Import these constants in both master-node and worker-node.

export const SOCKET_EVENTS = {
  // master → workers: request hash validation of a candidate block
  VALIDATE_BLOCK: "validate_block",
  // worker → master: computed hash response
  BLOCK_VALIDATED: "block_validated",
  // master → workers: consensus reached, persist this block
  NEW_BLOCK: "new_block",
  // worker → master: block written to local storage
  BLOCK_WRITTEN: "block_written",
  // worker → master: request chain state on connect
  SYNC_REQUEST: "sync_request",
  // master → worker: chain state response
  SYNC_RESPONSE: "sync_response",
  // master → all: current peer topology
  PEER_LIST: "peer_list",
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ── Payload shapes ────────────────────────────────────────────────────────────

export interface BlockData {
  voter: string;
  candidate: string;
}

export interface SerializedBlock {
  index: number;
  electionId: string;
  data: BlockData;
  timestamp: number;
  prevHash: string;
  hash: string;
}

export interface ValidateBlockPayload {
  index: number;
  electionId: string;
  data: BlockData;
  timestamp: number;
  prevHash: string;
}

export interface BlockValidatedPayload {
  nodeId: string;
  hash: string;
  index: number;
}

export interface NewBlockPayload extends SerializedBlock {}

export interface BlockWrittenPayload {
  nodeId: string;
  index: number;
}

export interface SyncRequestPayload {
  fromIndex?: number;
}

export interface SyncResponsePayload {
  blocks: SerializedBlock[];
}

export interface PeerInfo {
  nodeId: string;
  connectedAt: number;
}

export interface PeerListPayload {
  peers: PeerInfo[];
}

// ── Socket map (for socket.io typed emit/on) ──────────────────────────────────

export interface ServerToClientEvents {
  [SOCKET_EVENTS.VALIDATE_BLOCK]: (payload: ValidateBlockPayload) => void;
  [SOCKET_EVENTS.NEW_BLOCK]: (payload: NewBlockPayload) => void;
  [SOCKET_EVENTS.SYNC_RESPONSE]: (payload: SyncResponsePayload) => void;
  [SOCKET_EVENTS.PEER_LIST]: (payload: PeerListPayload) => void;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.BLOCK_VALIDATED]: (payload: BlockValidatedPayload) => void;
  [SOCKET_EVENTS.BLOCK_WRITTEN]: (payload: BlockWrittenPayload) => void;
  [SOCKET_EVENTS.SYNC_REQUEST]: (payload: SyncRequestPayload) => void;
}
