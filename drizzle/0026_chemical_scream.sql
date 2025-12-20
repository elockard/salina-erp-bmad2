CREATE TABLE "onix_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title_ids" uuid[] NOT NULL,
	"export_date" timestamp with time zone DEFAULT now() NOT NULL,
	"xml_content" text NOT NULL,
	"product_count" integer NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onix_exports" ADD CONSTRAINT "onix_exports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onix_exports" ADD CONSTRAINT "onix_exports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "onix_exports_tenant_id_idx" ON "onix_exports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "onix_exports_export_date_idx" ON "onix_exports" USING btree ("export_date");--> statement-breakpoint
CREATE INDEX "onix_exports_status_idx" ON "onix_exports" USING btree ("status");