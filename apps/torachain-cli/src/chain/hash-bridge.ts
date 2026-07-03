import { createHash } from "node:crypto";
import { ElectionBlock, ElectionsBlockData } from "../blockchain/index.ts";

// Convert a string ID (UUID or votingNumber) into a stable BigInt.
// We SHA256 the string and read the first 16 bytes as an unsigned big-endian integer.
export function idToBigInt(id: string): bigint {
  const digest = createHash("sha256").update(id).digest();
  let result = 0n;
  for (let i = 0; i < 16; i++) {
    result = (result << 8n) | BigInt(digest[i] ?? 0);
  }
  return result;
}

// Parse a wire-format hash (lowercase hex, "0" for genesis) into a BigInt.
export function hexToBigInt(hex: string): bigint {
  return BigInt("0x" + hex);
}

// Compute the block hash using the canonical ElectionBlock logic so master
// and subscribers always agree.
export function computeBlockHash(
  index: number,
  voterBigInt: bigint,
  commitment: string,
  timestamp: number,
  prevHashBigInt: bigint,
): bigint {
  const block = new ElectionBlock(
    index,
    new ElectionsBlockData(voterBigInt, commitment),
    timestamp,
    prevHashBigInt,
  );
  return block.hash;
}
