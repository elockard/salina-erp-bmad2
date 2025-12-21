CREATE TYPE "public"."proof_approval_status" AS ENUM('pending', 'approved', 'corrections_requested');--> statement-breakpoint
ALTER TABLE "proof_files" ADD COLUMN "approval_status" "proof_approval_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "proof_files" ADD COLUMN "approval_notes" text;--> statement-breakpoint
ALTER TABLE "proof_files" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proof_files" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "proof_files" ADD CONSTRAINT "proof_files_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;