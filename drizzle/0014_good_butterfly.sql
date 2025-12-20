ALTER TABLE "invoices" ADD COLUMN "pdf_s3_key" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "sent_at" timestamp with time zone;