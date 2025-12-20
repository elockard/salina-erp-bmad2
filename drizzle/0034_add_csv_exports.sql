-- Story 19.3: Export Catalog to CSV
-- Task 3: Create export tracking schema
-- Creates csv_exports table for tracking async export jobs

CREATE TABLE IF NOT EXISTS "csv_exports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "export_type" text NOT NULL,
  "filename" text NOT NULL,
  "filters" jsonb,
  "row_count" integer,
  "file_size" integer,
  "file_url" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "error_message" text,
  "requested_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "expires_at" timestamp with time zone
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "csv_exports_tenant_id_idx" ON "csv_exports" ("tenant_id");
CREATE INDEX IF NOT EXISTS "csv_exports_status_idx" ON "csv_exports" ("status");
CREATE INDEX IF NOT EXISTS "csv_exports_created_at_idx" ON "csv_exports" ("created_at");
CREATE INDEX IF NOT EXISTS "csv_exports_tenant_created_idx" ON "csv_exports" ("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "csv_exports_export_type_idx" ON "csv_exports" ("export_type");

-- Row Level Security
ALTER TABLE "csv_exports" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation
CREATE POLICY "csv_exports_tenant_isolation" ON "csv_exports"
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
