import { createHash } from "node:crypto";
import { ElectionBlock, ElectionsBlockData } from "@tora-chain/blockchain";

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

// Compute the block hash using the canonical ElectionBlock logic so master
// and workers always agree.
export function computeBlockHash(
  index: number,
  voterBigInt: bigint,
  candidateBigInt: bigint,
  timestamp: number,
  prevHashBigInt: bigint,
): bigint {
  const block = new ElectionBlock(
    index,
    new ElectionsBlockData(voterBigInt, candidateBigInt),
    timestamp,
    prevHashBigInt,
  );
  return block.hash;
}
