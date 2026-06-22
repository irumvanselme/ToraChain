import { createHash, randomBytes } from "node:crypto";

/** Human-recognisable prefix for every ToraChain API key. */
const KEY_NAMESPACE = "tck";

export interface GeneratedKey {
  /** The full secret. Returned to the caller exactly once, never stored. */
  token: string;
  /** Short public identifier (also embedded in the token) for display/lookup. */
  prefix: string;
  /** SHA-256 hash (hex) of the full token — this is what we persist. */
  hash: string;
}

/** SHA-256 (hex) of a token. Deterministic, so verification is a hash + lookup. */
export function hashApiKey(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Mint a new API key: `tck_<prefix>_<secret>`. */
export function generateApiKey(): GeneratedKey {
  const prefix = randomBytes(6).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const token = `${KEY_NAMESPACE}_${prefix}_${secret}`;
  return { token, prefix, hash: hashApiKey(token) };
}
