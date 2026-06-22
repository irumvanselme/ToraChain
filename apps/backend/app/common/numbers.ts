import { randomBytes } from "node:crypto";

/**
 * `electionNumber`, `candidateNumber` and `votingNumber` are large
 * server-generated identifiers (216-bit integers). They never fit in a JS
 * `number` or a Postgres `bigint`, so they are:
 *   - generated here from 27 cryptographically random bytes (27 * 8 = 216 bits),
 *   - stored in a Postgres `numeric` column (arbitrary precision; Drizzle maps
 *     it to a decimal string),
 *   - serialized over JSON as decimal strings to preserve full precision.
 */
const NUMBER_BYTES = 27; // 216 bits

/** Generate a 216-bit non-negative integer as a decimal string. */
export function generateBigNumber(): string {
  const bytes = randomBytes(NUMBER_BYTES);
  const value = BigInt(`0x${bytes.toString("hex")}`);
  return value.toString(10);
}
