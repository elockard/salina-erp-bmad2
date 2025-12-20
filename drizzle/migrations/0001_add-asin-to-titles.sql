ALTER TABLE "titles" ADD COLUMN "asin" text;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_asin_unique" UNIQUE("asin");