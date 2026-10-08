DROP INDEX "bibliography_isbn_idx";--> statement-breakpoint
ALTER TABLE "bibliographies" ADD COLUMN "isbn" varchar(50);--> statement-breakpoint
ALTER TABLE "bibliographies" ADD COLUMN "issn" varchar(20);--> statement-breakpoint
UPDATE "bibliographies"
SET 
  "isbn" = CASE 
    WHEN "isbn_issn" ~* '^ISSN' OR "isbn_issn" ~ '^\d{4}-\d{3}[\dX]$' THEN NULL 
    ELSE REGEXP_REPLACE("isbn_issn", '^ISBN[:\s]*', '', 'i') 
  END,
  "issn" = CASE 
    WHEN "isbn_issn" ~* '^ISSN' OR "isbn_issn" ~ '^\d{4}-\d{3}[\dX]$' THEN REGEXP_REPLACE("isbn_issn", '^ISSN[:\s]*', '', 'i') 
    ELSE NULL 
  END
WHERE "isbn_issn" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "bibliography_issn_idx" ON "bibliographies" USING btree ("issn");--> statement-breakpoint
CREATE INDEX "bibliography_isbn_issn_legacy_idx" ON "bibliographies" USING btree ("isbn_issn");--> statement-breakpoint
CREATE INDEX "bibliography_isbn_idx" ON "bibliographies" USING btree ("isbn");