-- Story 14.6: Add ONIX 3.0 Export Fallback
-- Task 4: Add onix_version column to onix_exports table
-- Tracks which ONIX version (3.0 or 3.1) was used for each export

ALTER TABLE onix_exports ADD COLUMN onix_version text NOT NULL DEFAULT '3.1';

-- Add comment for documentation
COMMENT ON COLUMN onix_exports.onix_version IS 'ONIX version used for export (3.0 or 3.1). Default 3.1 for backward compatibility.';
