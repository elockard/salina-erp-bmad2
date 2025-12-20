-- Story 3.6 AC 6: Add internal_note column for approval audit trail
ALTER TABLE "returns" ADD COLUMN IF NOT EXISTS "internal_note" text;
