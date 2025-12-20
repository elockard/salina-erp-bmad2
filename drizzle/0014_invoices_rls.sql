-- Invoices RLS (Row-Level Security) and Triggers
-- Story 8.1: Invoice Database Schema
-- Tenant isolation for invoices, payments tables
-- Invoice line items inherit security via CASCADE from invoices

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS on invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Invoices tenant isolation policy
-- All operations scoped to current tenant
CREATE POLICY invoices_tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Payments tenant isolation policy
-- All operations scoped to current tenant
-- Note: Payments are append-only (no update/delete in application layer)
CREATE POLICY payments_tenant_isolation ON payments
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Invoice line items do NOT have their own RLS
-- Security is inherited via:
-- 1. CASCADE delete from invoices table
-- 2. Foreign key constraint requiring valid invoice_id
-- 3. Application layer validates invoice ownership before line item operations

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

-- Trigger function for updated_at (if not already exists from contacts migration)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for invoices table
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================
-- To rollback this migration:
-- DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
-- DROP POLICY IF EXISTS payments_tenant_isolation ON payments;
-- DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
-- ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
-- Note: Do NOT drop update_updated_at_column() as it may be used by other tables
