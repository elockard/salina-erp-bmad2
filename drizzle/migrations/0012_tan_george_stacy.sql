CREATE TYPE "public"."workflow_stage" AS ENUM('manuscript_received', 'editing', 'design', 'proof', 'print_ready', 'complete');--> statement-breakpoint
ALTER TABLE "production_projects" ADD COLUMN "workflow_stage" "workflow_stage" DEFAULT 'manuscript_received' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_projects" ADD COLUMN "stage_entered_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "production_projects" ADD COLUMN "workflow_stage_history" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
CREATE INDEX "production_projects_workflow_stage_idx" ON "production_projects" USING btree ("workflow_stage");