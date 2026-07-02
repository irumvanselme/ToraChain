import { NextRequest, NextResponse } from "next/server";
import {
  ACCEPTED_EYE_SCANS,
  ACCEPTED_FINGERPRINTS,
  findVoterByEmailAndNationalId,
  logCheck,
} from "../../../db";

const API_KEY = process.env.ELIGIBILITY_API_KEY ?? "test-api-key-dev-only";

/**
 * POST /api/verify
 *
 * Eligibility check endpoint. Matches the ToraChain eligibility integration
 * spec (see docs/eligibility-api-specs.md).
 *
 * Request headers:
 *   x-api-key: <ELIGIBILITY_API_KEY>
 *
 * Request body (JSON):
 *   election-id       : string  — forwarded by the ToraChain backend
 *   voter-account-id  : string  — voter's account ID in the auth service
 *   email             : string  — voter's email address
 *   national-id       : string  — voter's national ID number
 *   fingerprint       : string  — (demo) mock fingerprint scan string
 *   eyes              : string  — (demo) mock eye-recognition scan string
 *
 * At least one of `fingerprint` / `eyes` is required. Provided scans must
 * match the hardcoded demo values (ACCEPTED_FINGERPRINTS / ACCEPTED_EYE_SCANS).
 *
 * Response:
 *   200  { id: "<voter UUID>" }   — voter is eligible
 *   400  { message: "..." }       — voter is not eligible
 *   401  { message: "..." }       — invalid API key
 */
export async function POST(req: NextRequest) {
  // --- Auth -----------------------------------------------------------------
  const providedKey = req.headers.get("x-api-key") ?? "";
  if (providedKey !== API_KEY) {
    return NextResponse.json({ message: "Invalid API key." }, { status: 401 });
  }

  // --- Parse body -----------------------------------------------------------
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const electionId = String(body["election-id"] ?? "").trim();
  const voterAccountId = String(body["voter-account-id"] ?? "").trim();
  const email = String(body["email"] ?? "")
    .trim()
    .toLowerCase();
  const nationalId = String(body["national-id"] ?? "").trim();
  const fingerprint = String(body["fingerprint"] ?? "").trim();
  const eyes = String(body["eyes"] ?? "").trim();
  const biometric =
    [fingerprint && "fingerprint", eyes && "eyes"].filter(Boolean).join("+") ||
    "none";

  if (!email || !nationalId) {
    return NextResponse.json(
      { message: "Both 'email' and 'national-id' fields are required." },
      { status: 400 },
    );
  }

  const reject = (reason: string) => {
    logCheck({
      electionId,
      voterAccountId,
      email,
      nationalId,
      biometric,
      eligible: false,
      reason,
    });
    return NextResponse.json({ message: reason }, { status: 400 });
  };

  // --- Demo biometric check ---------------------------------------------------
  if (!fingerprint && !eyes) {
    return reject("Either fingerprint or eyes is required.");
  }
  if (fingerprint && !ACCEPTED_FINGERPRINTS.includes(fingerprint)) {
    return reject("Fingerprint scan did not match.");
  }
  if (eyes && !ACCEPTED_EYE_SCANS.includes(eyes)) {
    return reject("Eye scan did not match.");
  }

  // --- Lookup ---------------------------------------------------------------
  const voter = findVoterByEmailAndNationalId(email, nationalId);
  const eligible = voter !== null;
  const reason = eligible
    ? "Voter found in database."
    : "No voter found with matching email and national ID.";

  logCheck({
    electionId,
    voterAccountId,
    email,
    nationalId,
    biometric,
    eligible,
    reason,
  });

  if (!eligible) {
    return NextResponse.json(
      { message: "Voter is not eligible for this election." },
      { status: 400 },
    );
  }

  // Return the voter's unique identifier (their UUID in this database).
  return NextResponse.json({ id: voter.id }, { status: 200 });
}
