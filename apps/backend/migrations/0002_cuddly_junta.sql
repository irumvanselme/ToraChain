ALTER TABLE "elections" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "elections" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
DROP TYPE "public"."election_status";--> statement-breakpoint
CREATE TYPE "public"."election_status" AS ENUM('draft', 'enrolling_voters', 'scheduled', 'active', 'ended', 'archived', 'paused');--> statement-breakpoint
ALTER TABLE "elections" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."election_status";--> statement-breakpoint
ALTER TABLE "elections" ALTER COLUMN "status" SET DATA TYPE "public"."election_status" USING "status"::"public"."election_status";