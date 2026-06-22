/**
 * Seed script: populates the JSON store with example voters.
 * Run with: bun run seed
 *
 * ⚠️ FOR DEVELOPMENT/TESTING ONLY — all data is synthetic.
 */
import { seedVoter } from "./db";

const voters = [
  { email: "alice@example.com", nationalId: "NID-001-ALICE" },
  { email: "bob@example.com", nationalId: "NID-002-BOB" },
  { email: "carol@example.com", nationalId: "NID-003-CAROL" },
  { email: "david@example.com", nationalId: "NID-004-DAVID" },
  { email: "eve@example.com", nationalId: "NID-005-EVE" },
  { email: "frank@example.com", nationalId: "NID-006-FRANK" },
  { email: "grace@example.com", nationalId: "NID-007-GRACE" },
  { email: "henry@example.com", nationalId: "NID-008-HENRY" },
];

let inserted = 0;
for (const v of voters) {
  if (seedVoter(v.email, v.nationalId)) inserted++;
}

console.log(`Seeded ${inserted} new voter(s). Total: ${voters.length}.`);
console.log("\nExample credentials for testing:");
voters.forEach((v) => {
  console.log(`  email=${v.email}  national-id=${v.nationalId}`);
});
