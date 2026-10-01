ALTER TABLE "guest_logs" ADD COLUMN "member_id" uuid;--> statement-breakpoint
ALTER TABLE "guest_logs" ADD COLUMN "institution" varchar(255);--> statement-breakpoint
ALTER TABLE "guest_logs" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "guest_logs" ADD COLUMN "phone" varchar(100);--> statement-breakpoint
ALTER TABLE "guest_logs" ADD COLUMN "study_program_id" integer;--> statement-breakpoint
ALTER TABLE "guest_logs" ADD COLUMN "faculty_id" integer;--> statement-breakpoint
ALTER TABLE "guest_logs" ADD COLUMN "type" varchar(50) DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "guest_logs" ADD CONSTRAINT "guest_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_logs" ADD CONSTRAINT "guest_logs_study_program_id_study_programs_id_fk" FOREIGN KEY ("study_program_id") REFERENCES "public"."study_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_logs" ADD CONSTRAINT "guest_logs_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guest_log_sp_idx" ON "guest_logs" USING btree ("study_program_id");--> statement-breakpoint
CREATE INDEX "guest_log_faculty_idx" ON "guest_logs" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "guest_log_type_idx" ON "guest_logs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "guest_log_member_idx" ON "guest_logs" USING btree ("member_id");