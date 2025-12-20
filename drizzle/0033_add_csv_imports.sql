-- CSV Imports table
-- Story 19.1: Import Catalog via CSV
-- FRs: FR170, FR171

CREATE TABLE "csv_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"import_type" text NOT NULL,
	"total_rows" integer NOT NULL,
	"imported_count" integer NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"created_title_ids" uuid[],
	"result_details" jsonb,
	"column_mappings" jsonb,
	"imported_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "csv_imports_tenant_id_idx" ON "csv_imports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "csv_imports_created_at_idx" ON "csv_imports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "csv_imports_status_idx" ON "csv_imports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "csv_imports_tenant_created_idx" ON "csv_imports" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "csv_imports_import_type_idx" ON "csv_imports" USING btree ("import_type");

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS on csv_imports table
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;

-- CSV Imports tenant isolation policy
-- All operations scoped to current tenant
CREATE POLICY csv_imports_tenant_isolation ON csv_imports
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================
-- To rollback this migration:
-- DROP POLICY IF EXISTS csv_imports_tenant_isolation ON csv_imports;
-- ALTER TABLE csv_imports DISABLE ROW LEVEL SECURITY;
-- DROP TABLE IF EXISTS csv_imports;
