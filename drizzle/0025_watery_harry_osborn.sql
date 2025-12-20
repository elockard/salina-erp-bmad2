CREATE TABLE "platform_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"type" varchar(20) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"target_roles" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_admin_email" varchar(255) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_email" varchar(255)
);
--> statement-breakpoint
CREATE INDEX "platform_announcements_active_starts_at_idx" ON "platform_announcements" USING btree ("is_active","starts_at");--> statement-breakpoint
CREATE INDEX "platform_announcements_type_idx" ON "platform_announcements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "platform_announcements_created_at_idx" ON "platform_announcements" USING btree ("created_at");