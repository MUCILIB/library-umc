ALTER TABLE "bibliography_contents" DROP CONSTRAINT "bibliography_contents_bibliography_id_bibliographies_id_fk";
--> statement-breakpoint
ALTER TABLE "bibliography_contents" ALTER COLUMN "content_type" SET DEFAULT 'pdf';--> statement-breakpoint
ALTER TABLE "bibliography_contents" ALTER COLUMN "content_url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "bibliography_contents" ADD COLUMN "file_size" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "bibliography_contents" ADD COLUMN "page_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "bibliography_contents" ADD COLUMN "is_full_access" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "bibliography_contents" ADD COLUMN "preview_start_page" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "bibliography_contents" ADD COLUMN "preview_end_page" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "bibliography_contents" ADD COLUMN "allow_download" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "bibliography_contents" ADD CONSTRAINT "bibliography_contents_bibliography_id_bibliographies_id_fk" FOREIGN KEY ("bibliography_id") REFERENCES "public"."bibliographies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bc_bibliography_idx" ON "bibliography_contents" USING btree ("bibliography_id");--> statement-breakpoint
CREATE INDEX "bc_deleted_at_idx" ON "bibliography_contents" USING btree ("deleted_at");