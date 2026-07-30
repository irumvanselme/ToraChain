import { createHash } from "node:crypto";

export function replacer(key: string, value: any) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

export function hash(data: any) {
  // Convert data to a string
  const stringifiedData = JSON.stringify(data, replacer);
  // Create an SHA-256 hashing function
  const hasher = createHash("sha256");
  hasher.update(stringifiedData);
  hasher.end();
  return BigInt("0x" + hasher.digest("hex"));
}

// Hashes travel between nodes as lowercase hex strings ("0" for the genesis
// sentinel) — see packages/specs. In memory they are always bigints; these two
// functions are the only place the two forms meet.

export function bigIntToHex(value: bigint): string {
  return value.toString(16);
}

export function hexToBigInt(hex: string): bigint {
  return BigInt("0x" + hex);
}
