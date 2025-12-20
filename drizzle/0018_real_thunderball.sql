-- Story 10.1: Add Multiple Authors Per Title with Ownership Percentages
-- Creates junction table for title-author relationships with ownership percentages

-- ==============================================================================
-- ROLLBACK INSTRUCTIONS (execute in reverse order if needed):
-- ==============================================================================
-- DROP TRIGGER IF EXISTS title_authors_updated_at_trigger ON title_authors;
-- DROP FUNCTION IF EXISTS update_title_authors_updated_at();
-- DROP INDEX IF EXISTS title_authors_contact_id_idx;
-- DROP INDEX IF EXISTS title_authors_title_id_idx;
-- ALTER TABLE title_authors DROP CONSTRAINT IF EXISTS title_authors_created_by_users_id_fk;
-- ALTER TABLE title_authors DROP CONSTRAINT IF EXISTS title_authors_contact_id_contacts_id_fk;
-- ALTER TABLE title_authors DROP CONSTRAINT IF EXISTS title_authors_title_id_titles_id_fk;
-- DROP TABLE IF EXISTS title_authors;
-- ==============================================================================

CREATE TABLE "title_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"ownership_percentage" numeric(5, 2) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "title_authors_title_contact_unique" UNIQUE("title_id","contact_id"),
	CONSTRAINT "title_authors_ownership_percentage_valid" CHECK (ownership_percentage >= 1 AND ownership_percentage <= 100)
);
--> statement-breakpoint
ALTER TABLE "title_authors" ADD CONSTRAINT "title_authors_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_authors" ADD CONSTRAINT "title_authors_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_authors" ADD CONSTRAINT "title_authors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "title_authors_title_id_idx" ON "title_authors" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "title_authors_contact_id_idx" ON "title_authors" USING btree ("contact_id");--> statement-breakpoint

-- ==============================================================================
-- Auto-update trigger for updated_at timestamp
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_title_authors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER title_authors_updated_at_trigger
BEFORE UPDATE ON title_authors
FOR EACH ROW EXECUTE FUNCTION update_title_authors_updated_at();--> statement-breakpoint

-- ==============================================================================
-- Data migration: Create entries from existing titles.contact_id
-- This ensures backward compatibility (AC-10.1.3)
-- Existing single-author titles get 100% ownership, is_primary = true
-- ==============================================================================
INSERT INTO title_authors (title_id, contact_id, ownership_percentage, is_primary)
SELECT id, contact_id, 100.00, true
FROM titles
WHERE contact_id IS NOT NULL
ON CONFLICT (title_id, contact_id) DO NOTHING;

-- ==============================================================================
-- MIGRATION VERIFICATION (run after migration to confirm success):
-- ==============================================================================
-- Verify all titles with contact_id have corresponding title_authors entries:
--
-- SELECT COUNT(*) as orphaned_titles
-- FROM titles t
-- WHERE t.contact_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM title_authors ta WHERE ta.title_id = t.id
--   );
-- Expected result: 0 orphaned titles
--
-- Verify all migrated entries have 100% ownership and is_primary = true:
--
-- SELECT COUNT(*) as migrated_entries,
--        SUM(CASE WHEN ownership_percentage = 100.00 AND is_primary = true THEN 1 ELSE 0 END) as correct_entries
-- FROM title_authors;
-- Expected: migrated_entries = correct_entries
-- ==============================================================================
