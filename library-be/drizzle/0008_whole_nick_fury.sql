CREATE TABLE "proposal_review_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"reviewer_user_id" text NOT NULL,
	"action" varchar(30) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_document_page_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"role_scope" varchar(30) DEFAULT 'PUBLIC' NOT NULL,
	"allowed_start_page" integer DEFAULT 1 NOT NULL,
	"allowed_end_page" integer DEFAULT 10 NOT NULL,
	"allow_download_full" boolean DEFAULT false NOT NULL,
	"configured_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "repo_rule_prop_role_unique" UNIQUE("proposal_id","role_scope")
);
--> statement-breakpoint
CREATE TABLE "repository_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_number" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"abstract" text,
	"keywords" text[],
	"author_user_id" text NOT NULL,
	"author_nim" varchar(30) NOT NULL,
	"author_name" varchar(150) NOT NULL,
	"study_program_id" integer,
	"advisor_name_1" varchar(150) NOT NULL,
	"advisor_name_2" varchar(150),
	"document_category" varchar(50) DEFAULT 'PROPOSAL',
	"status" varchar(30) DEFAULT 'SUBMITTED' NOT NULL,
	"storage_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"file_hash_sha256" varchar(64) NOT NULL,
	"reviewer_user_id" text,
	"review_notes" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "repository_proposals_proposal_number_unique" UNIQUE("proposal_number")
);
--> statement-breakpoint
ALTER TABLE "proposal_review_logs" ADD CONSTRAINT "proposal_review_logs_proposal_id_repository_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."repository_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_review_logs" ADD CONSTRAINT "proposal_review_logs_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_document_page_rules" ADD CONSTRAINT "repository_document_page_rules_proposal_id_repository_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."repository_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_document_page_rules" ADD CONSTRAINT "repository_document_page_rules_configured_by_users_id_fk" FOREIGN KEY ("configured_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_proposals" ADD CONSTRAINT "repository_proposals_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_proposals" ADD CONSTRAINT "repository_proposals_study_program_id_study_programs_id_fk" FOREIGN KEY ("study_program_id") REFERENCES "public"."study_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_proposals" ADD CONSTRAINT "repository_proposals_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repo_prop_author_idx" ON "repository_proposals" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "repo_prop_status_idx" ON "repository_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "repo_prop_program_idx" ON "repository_proposals" USING btree ("study_program_id");