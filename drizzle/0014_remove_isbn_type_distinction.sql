/**
 * Migration: Remove ISBN Type Distinction
 * Story 7.6 - Remove ISBN Type Distinction
 *
 * This migration nullifies the deprecated 'type' columns in isbn and isbn_prefix tables.
 * Columns are NOT dropped to support rollback capability.
 *
 * Changes:
 * 1. Set all isbns.type values to NULL
 * 2. Set all isbn_prefixes.type values to NULL
 * 3. Migrate titles.eisbn values to titles.isbn where isbn is NULL
 *
 * Rollback:
 * - No destructive changes; type columns remain for rollback
 * - If rollback needed, restore type values from application logic
 */

-- Nullify type column in isbns table
-- ISBNs are format-agnostic; type distinction was incorrect
--> statement-breakpoint
UPDATE isbns SET type = NULL WHERE type IS NOT NULL;

-- Nullify type column in isbn_prefixes table
-- Prefixes should not be tied to specific format types
--> statement-breakpoint
UPDATE isbn_prefixes SET type = NULL WHERE type IS NOT NULL;

-- Migrate eisbn values to isbn where title has eisbn but no isbn
-- This consolidates the two fields into one
--> statement-breakpoint
UPDATE titles
SET isbn = eisbn, updated_at = NOW()
WHERE eisbn IS NOT NULL AND isbn IS NULL;

-- Clear eisbn after migration to isbn
-- The isbn field now holds the consolidated value
--> statement-breakpoint
UPDATE titles
SET eisbn = NULL, updated_at = NOW()
WHERE eisbn IS NOT NULL;

-- Add comment to document migration
--> statement-breakpoint
COMMENT ON COLUMN isbns.type IS 'DEPRECATED (Story 7.6): ISBN type distinction removed. Field kept for rollback.';

--> statement-breakpoint
COMMENT ON COLUMN isbn_prefixes.type IS 'DEPRECATED (Story 7.6): ISBN type distinction removed. Field kept for rollback.';

--> statement-breakpoint
COMMENT ON COLUMN titles.eisbn IS 'DEPRECATED (Story 7.6): Use isbn column instead. ISBNs are format-agnostic.';
