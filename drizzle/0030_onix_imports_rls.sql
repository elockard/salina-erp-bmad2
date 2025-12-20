-- ONIX Imports RLS (Row-Level Security)
-- Story 14.5: Implement ONIX Import Parser
-- Tenant isolation for onix_imports table

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS on onix_imports table
ALTER TABLE onix_imports ENABLE ROW LEVEL SECURITY;

-- ONIX Imports tenant isolation policy
-- All operations scoped to current tenant
CREATE POLICY onix_imports_tenant_isolation ON onix_imports
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================
-- To rollback this migration:
-- DROP POLICY IF EXISTS onix_imports_tenant_isolation ON onix_imports;
-- ALTER TABLE onix_imports DISABLE ROW LEVEL SECURITY;
