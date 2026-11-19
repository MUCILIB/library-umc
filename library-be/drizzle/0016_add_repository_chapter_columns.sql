ALTER TABLE "repository_proposals" ADD COLUMN IF NOT EXISTS "chapter" varchar(50) DEFAULT 'FULL_TEXT';
ALTER TABLE "repository_proposals" ADD COLUMN IF NOT EXISTS "chapter_title" varchar(255);
