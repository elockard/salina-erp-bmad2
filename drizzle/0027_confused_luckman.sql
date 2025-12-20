ALTER TABLE "titles" ADD COLUMN "epub_accessibility_conformance" text;--> statement-breakpoint
ALTER TABLE "titles" ADD COLUMN "accessibility_features" text[];--> statement-breakpoint
ALTER TABLE "titles" ADD COLUMN "accessibility_hazards" text[];--> statement-breakpoint
ALTER TABLE "titles" ADD COLUMN "accessibility_summary" text;