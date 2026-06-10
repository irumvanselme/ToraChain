CREATE TYPE "public"."election_status" AS ENUM('draft', 'scheduled', 'active', 'inactive', 'closed', 'archived');--> statement-breakpoint
CREATE TABLE "candidates" (
	"candidate_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"manifesto" text,
	"candidate_number" numeric(78, 0) NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_candidate_number_unique" UNIQUE("candidate_number")
);
--> statement-breakpoint
CREATE TABLE "elections" (
	"election_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election_number" numeric(78, 0) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "election_status" DEFAULT 'draft' NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "elections_election_number_unique" UNIQUE("election_number")
);
--> statement-breakpoint
CREATE TABLE "eligibilities" (
	"eligibility_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voting_number" numeric(78, 0) NOT NULL,
	"voter_id" uuid NOT NULL,
	"election_id" uuid NOT NULL,
	"has_voted" boolean DEFAULT false NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eligibilities_voting_number_unique" UNIQUE("voting_number")
);
--> statement-breakpoint
CREATE TABLE "voters" (
	"voter_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"account_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voters_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"vote_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"eligibility_id" uuid NOT NULL,
	"voting_number" numeric(78, 0) NOT NULL,
	"cast_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_eligibility_id_unique" UNIQUE("eligibility_id")
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_election_id_elections_election_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("election_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibilities" ADD CONSTRAINT "eligibilities_voter_id_voters_voter_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("voter_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibilities" ADD CONSTRAINT "eligibilities_election_id_elections_election_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("election_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_election_id_elections_election_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("election_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_candidate_id_candidates_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("candidate_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_eligibility_id_eligibilities_eligibility_id_fk" FOREIGN KEY ("eligibility_id") REFERENCES "public"."eligibilities"("eligibility_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidates_election_idx" ON "candidates" USING btree ("election_id");--> statement-breakpoint
CREATE INDEX "elections_status_idx" ON "elections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "eligibilities_election_idx" ON "eligibilities" USING btree ("election_id");--> statement-breakpoint
CREATE UNIQUE INDEX "eligibilities_voter_election_uq" ON "eligibilities" USING btree ("voter_id","election_id") WHERE "eligibilities"."deleted" = false;--> statement-breakpoint
CREATE INDEX "votes_election_idx" ON "votes" USING btree ("election_id");