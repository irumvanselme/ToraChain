import crypto from "node:crypto";

export function randomBigInt(bytes: number) {
  let _bytes = crypto.randomBytes(bytes);
  return BigInt("0x" + _bytes.toString("hex"));
}
