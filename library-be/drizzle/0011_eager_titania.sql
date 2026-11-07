CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" varchar(50) NOT NULL,
	"menu_key" varchar(100) NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_add" boolean DEFAULT false NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_permission_role_menu_unique" UNIQUE("role_id","menu_key")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "return_staff_name" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "return_staff_signature" text;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "return_condition" varchar(50) DEFAULT 'good';--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "return_receipt_no" varchar(100);--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "card_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "card_renewal_status" varchar(50);--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "card_renewal_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions" USING btree ("role_id");