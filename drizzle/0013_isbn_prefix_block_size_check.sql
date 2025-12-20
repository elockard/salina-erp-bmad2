-- Story 7.4 MED-1: Add CHECK constraint for block_size validation
-- Ensures block_size is one of the valid ISBN block sizes at database level

ALTER TABLE "isbn_prefixes"
ADD CONSTRAINT "isbn_prefixes_block_size_check"
CHECK (block_size IN (10, 100, 1000, 10000, 100000, 1000000));
