// Canonical contract for the ToraChain pub/sub network.
//
// Subscribers join the master with an election topic in the socket.io
// handshake query (SubscriptionQuery). The master publishes every committed
// block to that election's topic; subscribers validate the block hash locally
// and log an error on mismatch. The same subscribers also serve as pBFT
// validators for new blocks.
//
// Hash format: `hash` and `prevHash` are lowercase hex strings ("0" for the
// genesis block). `data.voter` / `data.candidate` are decimal bigint strings.

// Subscribe to every election instead of a single one.
export const ALL_ELECTIONS = "all";

// Topic (socket.io room) a subscriber joins for one election.
export function electionTopic(electionId: string): string {
  return `election:${electionId}`;
}

export const SOCKET_EVENTS = {
  // master → subscribers: pBFT — request hash validation of a candidate block
  VALIDATE_BLOCK: "validate_block",
  // subscriber → master: pBFT — computed hash response
  BLOCK_VALIDATED: "block_validated",
  // master → topic subscribers: consensus reached, block committed (publish)
  NEW_BLOCK: "new_block",
  // subscriber → master: request chain state for the subscribed election
  SYNC_REQUEST: "sync_request",
  // master → subscriber: chain state response
  SYNC_RESPONSE: "sync_response",
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ── Handshake ─────────────────────────────────────────────────────────────────

// Sent as the socket.io connection query when a node joins the network.
export interface SubscriptionQuery {
  nodeId: string;
  // Local HTTP port where the subscriber serves its chain viewer.
  port: string;
  // Election to subscribe to, or ALL_ELECTIONS.
  electionId: string;
}

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

export interface SyncRequestPayload {
  fromIndex?: number;
}

export interface SyncResponsePayload {
  blocks: SerializedBlock[];
}

// ── Socket map (for socket.io typed emit/on) ──────────────────────────────────

export interface ServerToClientEvents {
  [SOCKET_EVENTS.VALIDATE_BLOCK]: (payload: ValidateBlockPayload) => void;
  [SOCKET_EVENTS.NEW_BLOCK]: (payload: NewBlockPayload) => void;
  [SOCKET_EVENTS.SYNC_RESPONSE]: (payload: SyncResponsePayload) => void;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.BLOCK_VALIDATED]: (payload: BlockValidatedPayload) => void;
  [SOCKET_EVENTS.SYNC_REQUEST]: (payload: SyncRequestPayload) => void;
}
