ALTER TABLE "eligibilities" ADD COLUMN "external_voter_id" text;--> statement-breakpoint
CREATE TABLE "election_integrations" (
	"integration_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election_id" uuid NOT NULL,
	"type" text DEFAULT 'http_api' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"form_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "election_integrations_election_id_unique" UNIQUE("election_id")
);
--> statement-breakpoint
ALTER TABLE "election_integrations" ADD CONSTRAINT "election_integrations_election_id_elections_election_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("election_id") ON DELETE cascade ON UPDATE no action;
