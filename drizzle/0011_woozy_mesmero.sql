CREATE TABLE "isbn_prefixes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prefix" text NOT NULL,
	"block_size" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"total_isbns" integer NOT NULL,
	"available_count" integer NOT NULL,
	"assigned_count" integer DEFAULT 0 NOT NULL,
	"generation_status" text DEFAULT 'pending' NOT NULL,
	"generation_error" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "isbn_prefixes_tenant_prefix_unique" UNIQUE("tenant_id","prefix")
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "isbns" ADD COLUMN "prefix_id" uuid;--> statement-breakpoint
ALTER TABLE "statements" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "titles" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "isbn_prefixes" ADD CONSTRAINT "isbn_prefixes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isbn_prefixes" ADD CONSTRAINT "isbn_prefixes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "isbn_prefixes_tenant_id_idx" ON "isbn_prefixes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "isbn_prefixes_generation_status_idx" ON "isbn_prefixes" USING btree ("generation_status");--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isbns" ADD CONSTRAINT "isbns_prefix_id_isbn_prefixes_id_fk" FOREIGN KEY ("prefix_id") REFERENCES "public"."isbn_prefixes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "isbns_prefix_id_idx" ON "isbns" USING btree ("prefix_id");--> statement-breakpoint
-- Enable RLS on isbn_prefixes for multi-tenant isolation
ALTER TABLE "isbn_prefixes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant isolation policy for isbn_prefixes
CREATE POLICY "tenant_isolation" ON "isbn_prefixes"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
-- Grant permissions to authenticated users
GRANT ALL ON "isbn_prefixes" TO authenticated;