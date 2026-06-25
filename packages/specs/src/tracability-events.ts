// Event types pushed to apps/tracability via POST /api/events.
// Both chain-node (emitter) and tracability (consumer) import from here.

export const TRACABILITY_EVENTS = {
  NODE_CONNECTED: "node_connected",
  NODE_DISCONNECTED: "node_disconnected",
  VOTE_RECEIVED: "vote_received",
  VALIDATE_BLOCK_SENT: "validate_block_sent",
  BLOCK_VALIDATED: "block_validated",
  CONSENSUS_REACHED: "consensus_reached",
  CONSENSUS_FAILED: "consensus_failed",
  NEW_BLOCK_BROADCAST: "new_block_broadcast",
  BLOCK_WRITTEN: "block_written",
} as const;

export type TracabilityEventType =
  (typeof TRACABILITY_EVENTS)[keyof typeof TRACABILITY_EVENTS];

// ── Payload shapes per event ──────────────────────────────────────────────────

export interface NodeConnectedEvent {
  type: typeof TRACABILITY_EVENTS.NODE_CONNECTED;
  nodeId: string;
  port: number;
  connectedAt: number;
}

export interface NodeDisconnectedEvent {
  type: typeof TRACABILITY_EVENTS.NODE_DISCONNECTED;
  nodeId: string;
  disconnectedAt: number;
}

export interface VoteReceivedEvent {
  type: typeof TRACABILITY_EVENTS.VOTE_RECEIVED;
  electionId: string;
  votingNumber: string;
  candidateId: string;
  receivedAt: number;
}

export interface ValidateBlockSentEvent {
  type: typeof TRACABILITY_EVENTS.VALIDATE_BLOCK_SENT;
  blockIndex: number;
  electionId: string;
  targetNodeIds: string[];
  sentAt: number;
}

export interface BlockValidatedEvent {
  type: typeof TRACABILITY_EVENTS.BLOCK_VALIDATED;
  nodeId: string;
  blockIndex: number;
  hash: string;
  validatedAt: number;
}

export interface ConsensusReachedEvent {
  type: typeof TRACABILITY_EVENTS.CONSENSUS_REACHED;
  blockIndex: number;
  agreedHash: string;
  agreeingNodeIds: string[];
  reachedAt: number;
}

export interface ConsensusFailedEvent {
  type: typeof TRACABILITY_EVENTS.CONSENSUS_FAILED;
  blockIndex: number;
  reason: string;
  responses: Array<{ nodeId: string; hash: string }>;
  failedAt: number;
}

export interface NewBlockBroadcastEvent {
  type: typeof TRACABILITY_EVENTS.NEW_BLOCK_BROADCAST;
  blockIndex: number;
  hash: string;
  broadcastAt: number;
}

export interface BlockWrittenEvent {
  type: typeof TRACABILITY_EVENTS.BLOCK_WRITTEN;
  nodeId: string;
  blockIndex: number;
  writtenAt: number;
}

export type TracabilityEvent =
  | NodeConnectedEvent
  | NodeDisconnectedEvent
  | VoteReceivedEvent
  | ValidateBlockSentEvent
  | BlockValidatedEvent
  | ConsensusReachedEvent
  | ConsensusFailedEvent
  | NewBlockBroadcastEvent
  | BlockWrittenEvent;
