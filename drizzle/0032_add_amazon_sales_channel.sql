-- Migration: Add 'amazon' to sales channel enum
-- Story 17.3: Import Amazon Sales Data
-- Task 0: Add 'amazon' to sales channel enum
--
-- This migration updates the CHECK constraint on the sales.channel column
-- to include 'amazon' as a valid value.
--
-- Drizzle's text enum creates a CHECK constraint like:
-- CHECK (channel IN ('retail', 'wholesale', 'direct', 'distributor'))
--
-- We need to drop the existing constraint and recreate it with 'amazon' included.

-- Step 1: Drop the existing channel CHECK constraint (if it exists)
-- Note: Constraint name may vary - Drizzle generates it automatically
DO $$
BEGIN
    -- Try to drop constraint with common naming patterns
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname LIKE '%channel%'
        AND conrelid = 'sales'::regclass
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE sales DROP CONSTRAINT ' || quote_ident(conname)
            FROM pg_constraint
            WHERE conname LIKE '%channel%'
            AND conrelid = 'sales'::regclass
            LIMIT 1
        );
    END IF;
END $$;

-- Step 2: Add new CHECK constraint with 'amazon' included
ALTER TABLE sales
ADD CONSTRAINT sales_channel_check
CHECK (channel IN ('retail', 'wholesale', 'direct', 'distributor', 'amazon'));

-- Verify the migration
DO $$
BEGIN
    -- Test that 'amazon' is now a valid value
    PERFORM 1 FROM pg_constraint
    WHERE conname = 'sales_channel_check'
    AND conrelid = 'sales'::regclass;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Migration failed: sales_channel_check constraint not created';
    END IF;
END $$;
