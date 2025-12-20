-- Story 19.5: BISAC Code Suggestions
-- Add BISAC subject code fields to titles table for categorization

-- Add primary BISAC code field
-- Format: 9-character code (3-letter prefix + 6-digit number)
-- Example: "FIC000000" for Fiction / General
ALTER TABLE "titles" ADD COLUMN IF NOT EXISTS "bisac_code" text;

-- Add secondary BISAC codes array
-- Industry standard allows max 3 BISAC codes per product
-- Stores up to 2 additional codes beyond the primary
ALTER TABLE "titles" ADD COLUMN IF NOT EXISTS "bisac_codes" text[];

-- Create index on bisac_code for filtering/searching by BISAC category
-- Partial index only indexes non-null values for efficiency
CREATE INDEX IF NOT EXISTS "titles_bisac_code_idx" ON "titles" ("bisac_code") WHERE "bisac_code" IS NOT NULL;
