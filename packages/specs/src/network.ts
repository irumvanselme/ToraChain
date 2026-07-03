// Canonical contract for the ToraChain pub/sub network (Google Cloud Pub/Sub).
//
// The master publishes every committed block to a shared topic tagged with
// an `electionId` message attribute; workers subscribe with a server-side
// filter for their chosen election (or every election via ALL_ELECTIONS).
// pBFT validation broadcasts go to every worker regardless of election —
// consensus needs all available validators to weigh in on every block, not
// just the ones subscribed to that election. Presence (which workers are
// currently listening) has no Pub/Sub equivalent of a live connection, so
// it's tracked via a lightweight heartbeat topic instead.
//
// Hash format: `hash` and `prevHash` are lowercase hex strings ("0" for the
// genesis block). `data.voter` is a decimal bigint string (idToBigInt of the
// voter's votingNumber). `data.commitment` is a lowercase SHA-256 hex string —
// a hiding commitment to the encrypted ballot record — stored verbatim (NOT a
// bigint); it must be hashed as-is by master and workers so their block hashes
// agree (converting it through BigInt would drop leading zeros and diverge).

// Subscribe to every election instead of a single one.
export const ALL_ELECTIONS = "all";

// Pub/Sub topic names. iac/terraform/pubsub.tf provisions these in
// deployments; nodes also create them on demand (idempotent) for local dev
// against the Pub/Sub emulator.
export const TOPICS = {
  // master → workers: newly committed block ("electionId" message attribute)
  NEW_BLOCK: "torachain-new-block",
  // master → workers: pBFT — request hash validation of a candidate block
  VALIDATE_BLOCK: "torachain-validate-block",
  // worker → master: pBFT — computed hash response
  BLOCK_VALIDATED: "torachain-block-validated",
  // worker → master: liveness heartbeat, used to track subscriber quorum
  WORKER_PRESENCE: "torachain-worker-presence",
} as const;

// Fixed, singleton subscriptions the master owns — one master process, so
// one subscription per topic is enough. Workers instead create their own
// subscription per topic (named after their nodeId) so each gets an
// independent copy of the stream rather than sharing a load-balanced one.
export const MASTER_SUBSCRIPTIONS = {
  BLOCK_VALIDATED: "torachain-block-validated-master",
  WORKER_PRESENCE: "torachain-worker-presence-master",
} as const;

// Server-side filter so a worker's NEW_BLOCK subscription only receives
// blocks for its election. `undefined` (no filter) receives every election.
export function newBlockFilter(electionId: string): string | undefined {
  return electionId === ALL_ELECTIONS
    ? undefined
    : `attributes.electionId = "${electionId}"`;
}

// ── Payload shapes ────────────────────────────────────────────────────────────

export interface BlockData {
  voter: string;
  commitment: string;
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

// Heartbeat a worker publishes periodically so the master can track live
// subscribers without a persistent connection to key off of.
export interface WorkerPresencePayload {
  nodeId: string;
  electionId: string;
  // Local HTTP port where the subscriber serves its chain viewer.
  port?: number;
}
