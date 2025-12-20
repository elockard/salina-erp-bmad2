-- Story 7.3: Migrate Authors to Contacts
-- Migrates existing author data to the unified contacts system
-- Run AFTER 0010_contacts_schema.sql and 0011_statements_rls.sql

-- =============================================================================
-- PHASE 1: Add contact_id columns to referencing tables
-- =============================================================================
-- Add contact_id to titles (nullable initially)
ALTER TABLE "titles" ADD COLUMN "contact_id" uuid;--> statement-breakpoint

-- Add contact_id to contracts (nullable initially)
ALTER TABLE "contracts" ADD COLUMN "contact_id" uuid;--> statement-breakpoint

-- Add contact_id to statements (nullable initially)
ALTER TABLE "statements" ADD COLUMN "contact_id" uuid;--> statement-breakpoint

-- =============================================================================
-- PHASE 2: Migrate author data to contacts
-- =============================================================================
-- Create temporary mapping table for author_id -> contact_id
CREATE TEMP TABLE author_contact_mapping AS
SELECT id as author_id, gen_random_uuid() as contact_id FROM authors;--> statement-breakpoint

-- Insert contacts from authors using pre-generated UUIDs
INSERT INTO contacts (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  address_line1,
  tax_id,
  payment_info,
  status,
  portal_user_id,
  created_at,
  updated_at
)
SELECT
  m.contact_id,
  a.tenant_id,
  -- Name splitting: everything before last space = first, after = last
  COALESCE(NULLIF(trim(substring(a.name from '^(.*) [^ ]+$')), ''), ''),
  COALESCE(substring(a.name from '([^ ]+)$'), a.name),
  a.email,
  a.phone,
  a.address,
  a.tax_id,  -- Copy encrypted value directly, no decryption needed
  CASE a.payment_method
    WHEN 'direct_deposit' THEN '{"method":"direct_deposit"}'::jsonb
    WHEN 'check' THEN '{"method":"check"}'::jsonb
    WHEN 'wire_transfer' THEN '{"method":"wire_transfer"}'::jsonb
    ELSE NULL
  END,
  CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END,
  a.portal_user_id,
  a.created_at,
  a.updated_at
FROM authors a
JOIN author_contact_mapping m ON a.id = m.author_id;--> statement-breakpoint

-- =============================================================================
-- PHASE 3: Create contact_roles for each migrated contact
-- =============================================================================
INSERT INTO contact_roles (id, contact_id, role, role_specific_data, assigned_at)
SELECT gen_random_uuid(), contact_id, 'author', '{}'::jsonb, NOW()
FROM author_contact_mapping;--> statement-breakpoint

-- =============================================================================
-- PHASE 4: Update FK references using mapping
-- =============================================================================
-- Update titles.contact_id from author_id mapping
UPDATE titles t SET contact_id = m.contact_id
FROM author_contact_mapping m WHERE t.author_id = m.author_id;--> statement-breakpoint

-- Update contracts.contact_id from author_id mapping
UPDATE contracts c SET contact_id = m.contact_id
FROM author_contact_mapping m WHERE c.author_id = m.author_id;--> statement-breakpoint

-- Update statements.contact_id from author_id mapping
UPDATE statements s SET contact_id = m.contact_id
FROM author_contact_mapping m WHERE s.author_id = m.author_id;--> statement-breakpoint

-- =============================================================================
-- PHASE 5: Add foreign key constraints
-- =============================================================================
-- Add FK constraint to titles
ALTER TABLE "titles" ADD CONSTRAINT "titles_contact_id_contacts_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Add FK constraint to contracts
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_contact_id_contacts_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

-- Add FK constraint to statements
ALTER TABLE "statements" ADD CONSTRAINT "statements_contact_id_contacts_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

-- =============================================================================
-- PHASE 6: Add indexes on new contact_id columns
-- =============================================================================
CREATE INDEX "titles_contact_id_idx" ON "titles" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contracts_contact_id_idx" ON "contracts" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "statements_contact_id_idx" ON "statements" USING btree ("contact_id");--> statement-breakpoint

-- Add composite index for tenant + author role queries (for efficient author lookups)
CREATE INDEX "contacts_tenant_author_role_idx" ON "contacts" USING btree ("tenant_id")
  WHERE EXISTS (SELECT 1 FROM contact_roles cr WHERE cr.contact_id = contacts.id AND cr.role = 'author');--> statement-breakpoint

-- Add index for portal access lookups (getMyStatements, getMyStatementById, etc.)
CREATE INDEX "contacts_portal_user_id_idx" ON "contacts" USING btree ("portal_user_id")
  WHERE "portal_user_id" IS NOT NULL;--> statement-breakpoint

-- Add index for author role lookups on contact_roles
CREATE INDEX "contact_roles_author_idx" ON "contact_roles" USING btree ("contact_id")
  WHERE "role" = 'author';--> statement-breakpoint

-- =============================================================================
-- PHASE 7: Clean up temp table
-- =============================================================================
DROP TABLE author_contact_mapping;

-- =============================================================================
-- VALIDATION QUERIES (run manually after migration)
-- =============================================================================
-- Pre-migration counts should match post-migration counts:
--
-- SELECT tenant_id, COUNT(*) as author_count FROM authors GROUP BY tenant_id;
--
-- SELECT c.tenant_id, COUNT(DISTINCT c.id) as contact_count
-- FROM contacts c
-- JOIN contact_roles cr ON cr.contact_id = c.id AND cr.role = 'author'
-- GROUP BY c.tenant_id;
--
-- Verify no orphaned FK references (should all return 0):
-- SELECT 'titles' as table_name, COUNT(*) as unlinked FROM titles WHERE contact_id IS NULL AND author_id IS NOT NULL
-- UNION ALL SELECT 'contracts', COUNT(*) FROM contracts WHERE contact_id IS NULL AND author_id IS NOT NULL
-- UNION ALL SELECT 'statements', COUNT(*) FROM statements WHERE contact_id IS NULL AND author_id IS NOT NULL;
--
-- Verify encryption still works (run in application context):
-- Call decryptTaxId() on migrated contacts to confirm encryption works

-- =============================================================================
-- ROLLBACK INSTRUCTIONS:
-- =============================================================================
-- To rollback this migration:
--
-- 1. Drop the new indexes:
-- DROP INDEX IF EXISTS contact_roles_author_idx;
-- DROP INDEX IF EXISTS contacts_portal_user_id_idx;
-- DROP INDEX IF EXISTS contacts_tenant_author_role_idx;
-- DROP INDEX IF EXISTS statements_contact_id_idx;
-- DROP INDEX IF EXISTS contracts_contact_id_idx;
-- DROP INDEX IF EXISTS titles_contact_id_idx;
--
-- 2. Drop the FK constraints:
-- ALTER TABLE statements DROP CONSTRAINT IF EXISTS statements_contact_id_contacts_id_fk;
-- ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_contact_id_contacts_id_fk;
-- ALTER TABLE titles DROP CONSTRAINT IF EXISTS titles_contact_id_contacts_id_fk;
--
-- 3. Drop the contact_id columns:
-- ALTER TABLE statements DROP COLUMN IF EXISTS contact_id;
-- ALTER TABLE contracts DROP COLUMN IF EXISTS contact_id;
-- ALTER TABLE titles DROP COLUMN IF EXISTS contact_id;
--
-- 4. Delete migrated contact_roles (where role='author' and no other roles exist):
-- DELETE FROM contact_roles WHERE role = 'author' AND assigned_by IS NULL;
--
-- 5. Delete migrated contacts (contacts that only have author role):
-- DELETE FROM contacts c
-- WHERE NOT EXISTS (
--   SELECT 1 FROM contact_roles cr
--   WHERE cr.contact_id = c.id AND cr.role != 'author'
-- );
--
-- NOTE: The authors table is PRESERVED - no data loss occurs
