CREATE TYPE "public"."submission_status" AS ENUM('pending_review', 'accepted', 'rejected', 'in_production');--> statement-breakpoint
CREATE TABLE "manuscript_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"title_id" uuid,
	"file_name" varchar(255) NOT NULL,
	"s3_key" varchar(500) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"notes" text,
	"status" "submission_status" DEFAULT 'pending_review' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"production_project_id" uuid
);
--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD CONSTRAINT "manuscript_submissions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD CONSTRAINT "manuscript_submissions_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD CONSTRAINT "manuscript_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD CONSTRAINT "manuscript_submissions_production_project_id_production_projects_id_fk" FOREIGN KEY ("production_project_id") REFERENCES "public"."production_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manuscript_submissions_tenant_contact_idx" ON "manuscript_submissions" USING btree ("tenant_id","contact_id");--> statement-breakpoint
CREATE INDEX "manuscript_submissions_tenant_status_idx" ON "manuscript_submissions" USING btree ("tenant_id","status");