CREATE TYPE "public"."production_status" AS ENUM('draft', 'in-progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "production_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"target_publication_date" date,
	"status" "production_status" DEFAULT 'draft' NOT NULL,
	"manuscript_file_key" text,
	"manuscript_file_name" varchar(255),
	"manuscript_file_size" text,
	"manuscript_uploaded_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "production_projects" ADD CONSTRAINT "production_projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_projects" ADD CONSTRAINT "production_projects_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_projects" ADD CONSTRAINT "production_projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_projects" ADD CONSTRAINT "production_projects_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_projects_tenant_id_idx" ON "production_projects" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "production_projects_title_id_idx" ON "production_projects" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "production_projects_status_idx" ON "production_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_projects_target_date_idx" ON "production_projects" USING btree ("target_publication_date");