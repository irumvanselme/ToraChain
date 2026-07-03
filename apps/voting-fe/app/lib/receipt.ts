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

/** The self-contained receipt a voter saves or downloads as a QR code. */
export interface Receipt {
  /** Schema version, for forward compatibility. */
  v: 1;
  electionId: string;
  voterId: string;
  votingNumber: string;
  /** Base64 raw AES-256 key — the secret that unlocks the ciphertext. */
  key: string;
  /** SHA-256 hex commitment (also stored server-side and on-chain). */
  commitment: string;
}

export interface SealedBallot {
  /** Base64 of `iv || AES-GCM(ciphertext)`. Sent to and stored by the server. */
  ciphertext: string;
  /** SHA-256 hex of `ciphertext`. */
  commitment: string;
  /** The printable/QR-encodable receipt string the voter keeps. */
  receiptString: string;
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
 * Mirrors `apps/torachain-cli/src/chain/hash-bridge.ts::idToBigInt`.
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

function encodeReceipt(receipt: Receipt): string {
  return toBase64(new TextEncoder().encode(JSON.stringify(receipt)));
}

/** Parse and validate a receipt string (throws on malformed input). */
export function parseReceipt(raw: string): Receipt {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(fromBase64(raw.trim())));
  } catch {
    throw new Error("This does not look like a valid vote receipt.");
  }
  const r = parsed as Partial<Receipt>;
  if (
    !r ||
    r.v !== 1 ||
    typeof r.electionId !== "string" ||
    typeof r.voterId !== "string" ||
    typeof r.votingNumber !== "string" ||
    typeof r.key !== "string" ||
    typeof r.commitment !== "string"
  ) {
    throw new Error("This receipt is missing required fields.");
  }
  return r as Receipt;
}

// ---- seal / open ---------------------------------------------------------

/**
 * Encrypt a ballot record under a fresh AES-256-GCM key and produce the sealed
 * ballot (ciphertext + commitment for the server) plus the receipt string (with
 * the key) for the voter.
 */
export async function sealBallot(record: BallotRecord): Promise<SealedBallot> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(JSON.stringify(record));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded),
  );

  const combined = new Uint8Array(iv.length + sealed.length);
  combined.set(iv);
  combined.set(sealed, iv.length);

  const ciphertext = toBase64(combined);
  const commitment = await sha256Hex(ciphertext);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));

  const receipt: Receipt = {
    v: 1,
    electionId: record.electionId,
    voterId: record.voterId,
    votingNumber: record.votingNumber,
    key: toBase64(rawKey),
    commitment,
  };

  return { ciphertext, commitment, receiptString: encodeReceipt(receipt) };
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
