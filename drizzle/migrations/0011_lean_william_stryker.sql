CREATE TYPE "public"."production_task_status" AS ENUM('pending', 'in-progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."production_task_type" AS ENUM('editing', 'design', 'proofing', 'printing', 'other');--> statement-breakpoint
CREATE TABLE "production_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"task_type" "production_task_type" NOT NULL,
	"status" "production_task_status" DEFAULT 'pending' NOT NULL,
	"vendor_id" uuid,
	"due_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_project_id_production_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."production_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_vendor_id_contacts_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_tasks_tenant_id_idx" ON "production_tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "production_tasks_project_id_idx" ON "production_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "production_tasks_vendor_id_idx" ON "production_tasks" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "production_tasks_status_idx" ON "production_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_tasks_due_date_idx" ON "production_tasks" USING btree ("due_date");