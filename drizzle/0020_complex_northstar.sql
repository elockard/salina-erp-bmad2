ALTER TABLE "contacts" ADD COLUMN "tin_encrypted" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "tin_type" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "tin_last_four" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "is_us_based" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "w9_received" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "w9_received_date" timestamp with time zone;