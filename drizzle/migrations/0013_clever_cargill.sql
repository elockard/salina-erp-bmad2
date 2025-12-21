CREATE TABLE "proof_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"file_key" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"notes" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "proof_files" ADD CONSTRAINT "proof_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_files" ADD CONSTRAINT "proof_files_project_id_production_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."production_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_files" ADD CONSTRAINT "proof_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_files" ADD CONSTRAINT "proof_files_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proof_files_tenant_id_idx" ON "proof_files" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "proof_files_project_id_idx" ON "proof_files" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "proof_files_project_version_idx" ON "proof_files" USING btree ("project_id","version");