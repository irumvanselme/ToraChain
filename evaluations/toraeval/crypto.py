"""Cryptographic primitives, faithful re-implementations of the TypeScript.

Two things are reproduced here so the harness can verify the real system rather
than trust it:

1. The blockchain block hash — a byte-for-byte port of
   ``apps/torachain-cli/src/blockchain`` (``block.ts`` + ``identity.ts``). This
   lets a Python "worker" re-hash blocks pulled from the master's public
   ``GET /api/chain`` and detect tampering exactly as ``ElectionBlock.IsValid``
   does (report §5.4.1).

2. The voter-side ballot seal — AES-GCM encryption + a SHA-256 commitment of
   the ciphertext, matching what ``voting-fe`` produces and what
   ``apps/backend/app/votes/service.ts`` re-derives and anchors (report §5.4.4).
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# ---------------------------------------------------------------------------
# Blockchain hashing (port of the torachain-cli core chain library)
# ---------------------------------------------------------------------------


def sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def id_to_bigint(identifier: str) -> int:
    """Port of ``idToBigInt``: SHA-256 the string, read the first 16 bytes as
    an unsigned big-endian integer."""
    digest = hashlib.sha256(identifier.encode("utf-8")).digest()
    result = 0
    for i in range(16):
        result = (result << 8) | digest[i]
    return result


def hex_to_bigint(hex_str: str) -> int:
    """Port of ``hexToBigInt`` — wire hashes are lowercase hex, ``"0"`` genesis."""
    return int(hex_str, 16)


def _hash_array(array: list) -> int:
    """Port of ``hash()``: SHA-256 over ``JSON.stringify`` of the value.

    ``JSON.stringify`` emits no whitespace and preserves key insertion order,
    so we serialise with compact separators and rely on dict ordering. The TS
    ``replacer`` turns every BigInt into its decimal string; we therefore pass
    BigInts in as Python ``str`` already (see ``compute_block_hash``).
    """
    stringified = json.dumps(array, separators=(",", ":"), ensure_ascii=False)
    return int(hashlib.sha256(stringified.encode("utf-8")).hexdigest(), 16)


def compute_block_hash(
    index: int,
    voter_bigint: int,
    commitment: str,
    timestamp: int,
    prev_hash_bigint: int,
) -> int:
    """Port of ``computeBlockHash`` / ``ElectionBlock`` construction.

    Block data hashed is ``[index, {voter, commitment}, timestamp, prevHash]``
    where ``voter`` and ``prevHash`` are decimal strings (BigInt -> string).
    """
    data = {"voter": str(voter_bigint), "commitment": commitment}
    block_data = [index, data, timestamp, str(prev_hash_bigint)]
    return _hash_array(block_data)


def recompute_wire_block_hash(block: dict) -> str:
    """Recompute the hex hash of a block as served by ``GET /api/chain``.

    Mirrors what a worker does on receipt: rebuild the hash from the block's
    own fields and compare to the transmitted ``hash``.
    """
    voter_bigint = int(block["data"]["voter"])
    prev_hash_bigint = hex_to_bigint(block["prevHash"])
    value = compute_block_hash(
        int(block["index"]),
        voter_bigint,
        block["data"]["commitment"],
        int(block["timestamp"]),
        prev_hash_bigint,
    )
    return format(value, "x")


# ---------------------------------------------------------------------------
# Voter-side ballot sealing (AES-GCM + SHA-256 commitment)
# ---------------------------------------------------------------------------


@dataclass
class SealedBallot:
    """A sealed ballot plus the key the voter keeps in their receipt."""

    candidate_id: str
    ciphertext: str  # base64(nonce || AES-GCM ciphertext) — sent to the server
    commitment: str  # SHA-256 hex of ciphertext — the value anchored on-chain
    key_b64: str  # AES key; part of the voter's private receipt


def seal_ballot(candidate_id: str) -> SealedBallot:
    """Encrypt a ballot client-side and commit to the ciphertext.

    The server re-derives ``commitment == SHA-256(ciphertext)`` and anchors the
    commitment (never the candidate) on the chain.
    """
    key = AESGCM.generate_key(bit_length=256)
    nonce = os.urandom(12)
    plaintext = json.dumps({"candidateId": candidate_id}).encode("utf-8")
    ct = AESGCM(key).encrypt(nonce, plaintext, None)
    ciphertext = base64.b64encode(nonce + ct).decode("ascii")
    return SealedBallot(
        candidate_id=candidate_id,
        ciphertext=ciphertext,
        commitment=sha256_hex(ciphertext),
        key_b64=base64.b64encode(key).decode("ascii"),
    )


def open_ballot(ciphertext_b64: str, key_b64: str) -> str | None:
    """Decrypt a sealed ballot; return the candidate id or ``None`` on failure."""
    try:
        raw = base64.b64decode(ciphertext_b64)
        key = base64.b64decode(key_b64)
        nonce, ct = raw[:12], raw[12:]
        plaintext = AESGCM(key).decrypt(nonce, ct, None)
        return json.loads(plaintext)["candidateId"]
    except Exception:
        return None
