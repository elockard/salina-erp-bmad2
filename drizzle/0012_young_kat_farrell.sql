ALTER TABLE "tenants" ADD COLUMN "royalty_period_type" text DEFAULT 'fiscal_year' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "royalty_period_start_month" integer;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "royalty_period_start_day" integer;