-- Ballot secrecy: sever every stored link between a voter and their ballot.
--
-- `votes.eligibility_id` joined to `eligibilities.voter_id`, which put the
-- voter and `votes.candidate_id` one join apart for anyone able to read this
-- database. `votes.voting_number` was the same leak by another route, since
-- `eligibilities.voting_number` is unique per voter. Both go.
--
-- This is deliberately destructive and irreversible: existing ballots lose
-- their (already-compromised) association with a voter. Tallies, which only
-- read `election_id` / `candidate_id`, are unaffected. Voters keep the ability
-- to verify through the receipt they hold (`<vote_id>:<key>`) — the link now
-- lives only outside the database, with the voter.
--
-- One ballot per eligibility is still enforced, by the guarded `has_voted`
-- flip that shares a transaction with the vote insert (see votes/repository.ts).
ALTER TABLE "votes" DROP CONSTRAINT "votes_eligibility_id_unique";--> statement-breakpoint
ALTER TABLE "votes" DROP CONSTRAINT "votes_eligibility_id_eligibilities_eligibility_id_fk";
--> statement-breakpoint
ALTER TABLE "votes" DROP COLUMN "eligibility_id";--> statement-breakpoint
ALTER TABLE "votes" DROP COLUMN "voting_number";--> statement-breakpoint
-- Same leak, by timing: `has_voted` was flipped with `updated_at = now()` in
-- the transaction that inserted the vote, so lining eligibilities up against
-- `votes.cast_at` re-identifies each voter to within milliseconds. Collapse the
-- historical stamps (nothing reads this column — the eligibility DTO omits it,
-- and keyset pagination uses `created_at`); the application no longer writes it
-- when recording a vote.
UPDATE "eligibilities" SET "updated_at" = "created_at" WHERE "has_voted" = true;
