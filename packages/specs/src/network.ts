// Canonical contract for the ToraChain pub/sub network (Google Cloud Pub/Sub).
//
// The master publishes every committed block to a single shared topic tagged
// with an `electionId` message attribute; workers subscribe with a server-side
// filter for their chosen election (or every election via ALL_ELECTIONS).
// Workers are pure subscribers — they only receive published blocks and never
// publish anything back.
//
// Hash format: `hash` and `prevHash` are lowercase hex strings ("0" for the
// genesis block). `data.voter` is a decimal bigint string (idToBigInt of the
// voter's votingNumber). `data.commitment` is a lowercase SHA-256 hex string —
// a hiding commitment to the encrypted ballot record — stored verbatim (NOT a
// bigint); it must be hashed as-is by master and workers so their block hashes
// agree (converting it through BigInt would drop leading zeros and diverge).

// Subscribe to every election instead of a single one.
export const ALL_ELECTIONS = "all";

// Pub/Sub topic names. iac/terraform/pubsub.tf provisions this in deployments;
// nodes also create it on demand (idempotent) for local dev against the
// Pub/Sub emulator.
export const TOPICS = {
  // master → workers: newly committed block ("electionId" message attribute)
  NEW_BLOCK: "torachain-new-block",
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

export interface NewBlockPayload extends SerializedBlock {}
