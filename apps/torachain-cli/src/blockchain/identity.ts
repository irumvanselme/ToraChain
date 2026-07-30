import { createHash } from "node:crypto";

// Number of leading SHA-256 bytes read as the voter identifier. Wide enough
// that two voting numbers colliding is not a practical concern, narrow enough
// to stay readable in the chain viewer.
const ID_BYTES = 16;

/**
 * Convert a string ID (a UUID or a votingNumber) into a stable BigInt: SHA-256
 * the string and read the first 16 bytes as an unsigned big-endian integer.
 *
 * This is what a block records instead of the voter's number itself, and it is
 * how a voter's browser locates their own block — the voting-fe re-implements
 * it in `apps/voting-fe/app/lib/receipt.ts`, so the two must stay in step.
 */
export function idToBigInt(id: string): bigint {
  const digest = createHash("sha256").update(id).digest();
  let result = 0n;
  for (let i = 0; i < ID_BYTES; i++) {
    result = (result << 8n) | BigInt(digest[i] ?? 0);
  }
  return result;
}
