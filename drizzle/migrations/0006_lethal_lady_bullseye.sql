CREATE TABLE "csv_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"export_type" text NOT NULL,
	"filename" text NOT NULL,
	"filters" jsonb,
	"row_count" integer,
	"file_size" integer,
	"file_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"requested_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
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
	"updated_title_ids" uuid[],
	"import_mode" text,
	"update_details" jsonb,
	"result_details" jsonb,
	"column_mappings" jsonb,
	"imported_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "csv_exports" ADD CONSTRAINT "csv_exports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_exports" ADD CONSTRAINT "csv_exports_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "csv_exports_tenant_id_idx" ON "csv_exports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "csv_exports_status_idx" ON "csv_exports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "csv_exports_created_at_idx" ON "csv_exports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "csv_exports_tenant_created_idx" ON "csv_exports" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "csv_exports_export_type_idx" ON "csv_exports" USING btree ("export_type");--> statement-breakpoint
CREATE INDEX "csv_imports_tenant_id_idx" ON "csv_imports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "csv_imports_created_at_idx" ON "csv_imports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "csv_imports_status_idx" ON "csv_imports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "csv_imports_tenant_created_idx" ON "csv_imports" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "csv_imports_import_type_idx" ON "csv_imports" USING btree ("import_type");