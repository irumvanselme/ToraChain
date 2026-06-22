import { NextRequest, NextResponse } from "next/server";
import { findVoterByEmailAndNationalId, logCheck } from "../../../db";

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

  if (!email || !nationalId) {
    return NextResponse.json(
      { message: "Both 'email' and 'national-id' fields are required." },
      { status: 400 },
    );
  }

  // --- Lookup ---------------------------------------------------------------
  const voter = findVoterByEmailAndNationalId(email, nationalId);
  const eligible = voter !== null;
  const reason = eligible
    ? "Voter found in database."
    : "No voter found with matching email and national ID.";

  logCheck({ electionId, voterAccountId, email, nationalId, eligible, reason });

  if (!eligible) {
    return NextResponse.json(
      { message: "Voter is not eligible for this election." },
      { status: 400 },
    );
  }

  // Return the voter's unique identifier (their UUID in this database).
  return NextResponse.json({ id: voter.id }, { status: 200 });
}
