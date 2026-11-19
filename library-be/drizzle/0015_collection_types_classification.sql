ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "code" varchar(50) DEFAULT 'S' NOT NULL;
ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "can_be_borrowed" boolean DEFAULT true NOT NULL;
ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "color_tag" varchar(50);
ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
