CREATE TABLE "onix_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"onix_version" text NOT NULL,
	"total_products" integer NOT NULL,
	"imported_count" integer NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"created_title_ids" uuid[],
	"created_contact_ids" uuid[],
	"result_details" jsonb,
	"imported_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onix_imports" ADD CONSTRAINT "onix_imports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onix_imports" ADD CONSTRAINT "onix_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "onix_imports_tenant_id_idx" ON "onix_imports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "onix_imports_created_at_idx" ON "onix_imports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "onix_imports_status_idx" ON "onix_imports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "onix_imports_tenant_created_idx" ON "onix_imports" USING btree ("tenant_id","created_at");