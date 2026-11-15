ALTER TYPE "public"."logs_entity" ADD VALUE 'role';--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "event_type" text;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "outcome" text;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "actor_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "target_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "changes" jsonb;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "occurred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "occurred_at" SET DEFAULT now();