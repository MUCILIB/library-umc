ALTER TABLE "bibliographies" ADD COLUMN IF NOT EXISTS "is_popular" boolean DEFAULT false NOT NULL;
