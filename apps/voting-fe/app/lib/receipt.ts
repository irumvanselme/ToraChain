// Client-side vote-verification cryptography.
//
// When a voter casts a ballot we generate a fresh AES-GCM key *in the browser*,
// encrypt a record of the vote with it, and hand the voter a receipt that
// embeds the key. The key never reaches the server, so the voter is the one and
// only party who can later decrypt the record and confirm it names the same
// candidate the backend counted and the blockchain anchored.
//
// The server anchors only `commitment = SHA-256(ciphertext)` on-chain — an
// opaque, hiding commitment that does not leak the (small) candidate set. It is
// computed over the exact base64 `ciphertext` string, byte-for-byte identical to
// the backend's `createHash("sha256").update(ciphertext)`.

/** The plaintext record sealed inside the voter's encrypted ballot receipt. */
export interface BallotRecord {
  electionId: string;
  voterId: string;
  votingNumber: string;
  candidateId: string;
  candidateName: string;
  /** Client-side cast time (ISO-8601). Informational; the server owns castAt. */
  castTime: string;
}

/**
 * The receipt a voter saves or downloads as a QR code: `<voteId>:<key>`.
 *
 * These two halves are all the verification flow needs, and deliberately all
 * it gets. The backend stores no link between a voter and their ballot — that
 * is what stops anyone reading its database from seeing who voted for whom —
 * so `voteId` is the only handle that reaches the stored vote, and `key` (which
 * the server never sees) is the only thing that opens it. Everything else the
 * verify page shows comes out of the decrypted {@link BallotRecord}.
 */
export interface Receipt {
  /** Id of the recorded ballot, returned by the server at cast time. */
  voteId: string;
  /** Base64 raw AES-256 key — the secret that unlocks the ciphertext. */
  key: string;
}

export interface SealedBallot {
  /** Base64 of `iv || AES-GCM(ciphertext)`. Sent to and stored by the server. */
  ciphertext: string;
  /** SHA-256 hex of `ciphertext`. */
  commitment: string;
  /**
   * Base64 raw AES key. Pair it with the `voteId` the cast response returns
   * (see {@link formatReceipt}) — the key exists only in this browser until
   * the voter saves the receipt.
   */
  key: string;
}

const IV_BYTES = 12;

// ---- base64 helpers ------------------------------------------------------

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ---- hashing -------------------------------------------------------------

/** SHA-256 hex (lowercase) of a UTF-8 string — matches the backend + chain. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * The blockchain identifies a voter's block by `idToBigInt(votingNumber)` — the
 * first 16 bytes of SHA-256(votingNumber) as a big-endian unsigned integer.
 * Re-implemented here so the browser can locate the right on-chain block.
 * Mirrors `apps/torachain-cli/src/blockchain/identity.ts::idToBigInt`.
 */
export async function idToBigInt(id: string): Promise<bigint> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id)),
  );
  // Avoid BigInt literals (`0n`/`8n`) so this compiles under the ES2017 target.
  const eight = BigInt(8);
  let result = BigInt(0);
  for (let i = 0; i < 16; i++) {
    result = (result << eight) | BigInt(digest[i] ?? 0);
  }
  return result;
}

// ---- receipt encoding ----------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Build the receipt string a voter keeps: the vote id and its key. */
export function formatReceipt(voteId: string, key: string): string {
  return `${voteId}:${key}`;
}

/** Parse and validate a `<voteId>:<key>` receipt (throws on malformed input). */
export function parseReceipt(raw: string): Receipt {
  // The base64 key can itself contain no ':', so splitting on the first one is
  // unambiguous.
  const trimmed = raw.trim();
  const separator = trimmed.indexOf(":");
  if (separator === -1) {
    throw new Error("This does not look like a valid vote receipt.");
  }

  const voteId = trimmed.slice(0, separator);
  const key = trimmed.slice(separator + 1);
  if (!UUID_RE.test(voteId) || key.length === 0) {
    throw new Error("This does not look like a valid vote receipt.");
  }

  return { voteId, key };
}

// ---- seal / open ---------------------------------------------------------

/**
 * Encrypt a ballot record under a fresh AES-256-GCM key and produce the sealed
 * ballot (ciphertext + commitment for the server) plus the key for the voter.
 * The caller pairs that key with the `voteId` the cast response returns to form
 * the receipt — see {@link formatReceipt}.
 */
export async function sealBallot(record: BallotRecord): Promise<SealedBallot> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES)); // Initialization Vector
  const encoded = new TextEncoder().encode(JSON.stringify(record));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded),
  ); // Encrypted record

  const combined = new Uint8Array(iv.length + sealed.length);
  combined.set(iv);
  combined.set(sealed, iv.length);

  const ciphertext = toBase64(combined);
  const commitment = await sha256Hex(ciphertext);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));

  return { ciphertext, commitment, key: toBase64(rawKey) };
}

/**
 * Decrypt a ciphertext with a receipt's base64 key, recovering the ballot
 * record. Throws if the key does not match (tampering or wrong receipt).
 */
export async function openBallot(
  ciphertext: string,
  keyBase64: string,
): Promise<BallotRecord> {
  const combined = fromBase64(ciphertext);
  const iv = combined.slice(0, IV_BYTES);
  const body = combined.slice(IV_BYTES);
  const key = await crypto.subtle.importKey(
    "raw",
    fromBase64(keyBase64) as BufferSource,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      body as BufferSource,
    );
  } catch {
    throw new Error(
      "Could not decrypt the ballot — the receipt key does not match the stored ciphertext.",
    );
  }
  return JSON.parse(new TextDecoder().decode(plaintext)) as BallotRecord;
}
