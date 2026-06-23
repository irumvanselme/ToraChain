-- Replace the election_status enum with the new lifecycle states.
-- Postgres cannot remove enum values directly, so we rename the old type,
-- create the new one, migrate any existing rows, then drop the old type.

-- 1. Preserve the old type under a temporary name.
ALTER TYPE "public"."election_status" RENAME TO "election_status_old";--> statement-breakpoint

-- 2. Create the new enum with the updated set of values.
CREATE TYPE "public"."election_status" AS ENUM(
  'draft',
  'enrolling_voters',
  'scheduled',
  'active',
  'ended',
  'archived',
  'paused'
);--> statement-breakpoint

-- 3. Migrate the column, mapping removed values to their nearest equivalent:
--      inactive → paused   (admin-paused state)
--      closed   → ended    (election finished, results pending)
ALTER TABLE "elections"
  ALTER COLUMN "status"
  TYPE "public"."election_status"
  USING CASE "status"::text
    WHEN 'inactive' THEN 'paused'
    WHEN 'closed'   THEN 'ended'
    ELSE "status"::text
  END::"public"."election_status";--> statement-breakpoint

-- 4. Remove the old type now that the column no longer references it.
DROP TYPE "public"."election_status_old";
