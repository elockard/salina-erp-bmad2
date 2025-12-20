CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"tax_id" text,
	"payment_method" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "authors_tenant_id_idx" ON "authors" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "authors_email_idx" ON "authors" USING btree ("email");--> statement-breakpoint
CREATE INDEX "authors_is_active_idx" ON "authors" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "authors_tenant_id_is_active_idx" ON "authors" USING btree ("tenant_id","is_active");--> statement-breakpoint
-- Enable Row-Level Security on authors table (AC8)
ALTER TABLE "authors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Create tenant isolation policy (AC9) - enforces tenant_id boundary
CREATE POLICY "tenant_isolation_policy" ON "authors" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);