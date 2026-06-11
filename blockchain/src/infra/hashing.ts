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
