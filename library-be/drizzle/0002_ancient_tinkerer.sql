CREATE TABLE "guest_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"name" varchar(255) NOT NULL,
	"identifier" varchar(100) NOT NULL,
	"institution" varchar(255),
	"faculty" varchar(255),
	"major" varchar(255),
	"visit_date" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "acquisitions" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "acquisitions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "acquisitions" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "acquisitions" ALTER COLUMN "collection_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "collection_contents" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "collection_contents" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "collection_contents" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "collection_contents" ALTER COLUMN "collection_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "collection_views" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "collection_views" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "collection_views" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "collection_views" ALTER COLUMN "collection_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "collections" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "collections" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "collections" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "fines" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "fines" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "fines" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "fines" ALTER COLUMN "loan_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "collection_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "member_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "item_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "entity_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "recommendations" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "recommendations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "recommendations" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "member_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "collection_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "fine_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "image" text;