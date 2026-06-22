/**
 * Simple file-based storage for the dev-only example app.
 * Uses plain JSON files in ./data/ — works in both Bun and Node.js.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = join(process.cwd(), "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const VOTERS_FILE = join(DATA_DIR, "voters.json");
const LOG_FILE = join(DATA_DIR, "check_log.json");

// ---- Types ---------------------------------------------------------------

export interface Voter {
  id: string;
  email: string;
  national_id: string;
  created_at: string;
}

export interface CheckLogEntry {
  id: number;
  election_id: string;
  voter_account_id: string;
  email: string;
  national_id: string;
  eligible: boolean;
  reason: string;
  checked_at: string;
}

// ---- Helpers -------------------------------------------------------------

function readVoters(): Voter[] {
  try {
    return JSON.parse(readFileSync(VOTERS_FILE, "utf8")) as Voter[];
  } catch {
    return [];
  }
}

function writeVoters(voters: Voter[]): void {
  writeFileSync(VOTERS_FILE, JSON.stringify(voters, null, 2));
}

function readLog(): CheckLogEntry[] {
  try {
    return JSON.parse(readFileSync(LOG_FILE, "utf8")) as CheckLogEntry[];
  } catch {
    return [];
  }
}

function writeLog(log: CheckLogEntry[]): void {
  writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

// ---- Public API ----------------------------------------------------------

export function getAllVoters(): Voter[] {
  return readVoters().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getAllCheckLog(): CheckLogEntry[] {
  return readLog()
    .sort((a, b) => b.checked_at.localeCompare(a.checked_at))
    .slice(0, 200);
}

export function findVoterByEmailAndNationalId(
  email: string,
  nationalId: string,
): Voter | null {
  const normalEmail = email.toLowerCase().trim();
  const normalId = nationalId.trim();
  return (
    readVoters().find(
      (v) => v.email === normalEmail && v.national_id === normalId,
    ) ?? null
  );
}

export function logCheck(entry: {
  electionId: string;
  voterAccountId: string;
  email: string;
  nationalId: string;
  eligible: boolean;
  reason: string;
}): void {
  const log = readLog();
  log.push({
    id: Date.now(),
    election_id: entry.electionId,
    voter_account_id: entry.voterAccountId,
    email: entry.email.toLowerCase().trim(),
    national_id: entry.nationalId.trim(),
    eligible: entry.eligible,
    reason: entry.reason,
    checked_at: new Date().toISOString(),
  });
  writeLog(log);
}

export function seedVoter(email: string, nationalId: string): boolean {
  const voters = readVoters();
  if (voters.find((v) => v.email === email.toLowerCase().trim())) return false;
  voters.push({
    id: randomUUID(),
    email: email.toLowerCase().trim(),
    national_id: nationalId.trim(),
    created_at: new Date().toISOString(),
  });
  writeVoters(voters);
  return true;
}
