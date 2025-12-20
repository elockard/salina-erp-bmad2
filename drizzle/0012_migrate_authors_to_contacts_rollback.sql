-- Story 7.3: Rollback Migration - Authors to Contacts
-- USE ONLY IN EMERGENCY - This will undo the migration from 0012_migrate_authors_to_contacts.sql
-- WARNING: Run this within 30-day rollback window before author_id columns are removed

-- =============================================================================
-- PHASE 1: Drop indexes
-- =============================================================================
DROP INDEX IF EXISTS contact_roles_author_idx;
DROP INDEX IF EXISTS contacts_portal_user_id_idx;
DROP INDEX IF EXISTS contacts_tenant_author_role_idx;
DROP INDEX IF EXISTS statements_contact_id_idx;
DROP INDEX IF EXISTS contracts_contact_id_idx;
DROP INDEX IF EXISTS titles_contact_id_idx;

-- =============================================================================
-- PHASE 2: Drop FK constraints
-- =============================================================================
ALTER TABLE statements DROP CONSTRAINT IF EXISTS statements_contact_id_contacts_id_fk;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_contact_id_contracts_id_fk;
ALTER TABLE titles DROP CONSTRAINT IF EXISTS titles_contact_id_contacts_id_fk;

-- =============================================================================
-- PHASE 3: Drop contact_id columns
-- =============================================================================
ALTER TABLE statements DROP COLUMN IF EXISTS contact_id;
ALTER TABLE contracts DROP COLUMN IF EXISTS contact_id;
ALTER TABLE titles DROP COLUMN IF EXISTS contact_id;

-- =============================================================================
-- PHASE 4: Delete migrated contact_roles (system-migrated author roles)
-- Only delete roles that were system-generated during migration (assigned_by IS NULL)
-- =============================================================================
DELETE FROM contact_roles
WHERE role = 'author'
  AND assigned_by IS NULL;

-- =============================================================================
-- PHASE 5: Delete migrated contacts
-- Delete contacts that no longer have any roles (were only authors from migration)
-- =============================================================================
DELETE FROM contacts c
WHERE NOT EXISTS (
  SELECT 1 FROM contact_roles cr
  WHERE cr.contact_id = c.id
);

-- =============================================================================
-- VERIFICATION QUERIES (run after rollback)
-- =============================================================================
-- Verify original authors table is intact:
-- SELECT tenant_id, COUNT(*) as author_count FROM authors GROUP BY tenant_id;

-- Verify FK references work with original author_id:
-- SELECT COUNT(*) FROM titles WHERE author_id IS NOT NULL;
-- SELECT COUNT(*) FROM contracts WHERE author_id IS NOT NULL;
-- SELECT COUNT(*) FROM statements WHERE author_id IS NOT NULL;

-- Verify contacts table is clean of migrated data:
-- SELECT COUNT(*) FROM contacts c
-- WHERE EXISTS (SELECT 1 FROM contact_roles cr WHERE cr.contact_id = c.id AND cr.role = 'author');
-- Should return 0 (or only manually-created author contacts)

-- =============================================================================
-- POST-ROLLBACK STEPS:
-- =============================================================================
-- 1. Update application code to use authors table (revert Task 4-8 changes)
-- 2. Run full test suite to verify functionality
-- 3. Clear any caches that may have contact data
-- 4. Notify team that rollback is complete
