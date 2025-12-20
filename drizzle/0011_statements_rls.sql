-- Story 5.1: Create Statements Database Schema and PDF Storage
-- RLS policies for statements table supporting both internal and portal users
-- ============================================================================
-- AC-5.1.4: RLS policy isolates statements by tenant_id
-- AC-5.1.5: Author-specific RLS policy restricts portal queries to own statements
-- ============================================================================

-- Enable Row-Level Security on statements table
ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (for idempotent migration)
DROP POLICY IF EXISTS statements_tenant_select ON public.statements;
DROP POLICY IF EXISTS statements_tenant_insert ON public.statements;
DROP POLICY IF EXISTS statements_tenant_update ON public.statements;
DROP POLICY IF EXISTS statements_portal_select ON public.statements;

-- ============================================================================
-- STATEMENTS TABLE POLICIES
-- ============================================================================

-- AC-5.1.4: Internal users (Finance, Admin, Owner) can view all statements in their tenant
-- This allows Finance role to manage statement generation and delivery
CREATE POLICY "statements_tenant_select" ON public.statements
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin', 'finance')
        AND is_active = true
    )
  );

-- Internal users (Finance, Admin, Owner) can insert statements in their tenant
-- Used when generating statements via the wizard
CREATE POLICY "statements_tenant_insert" ON public.statements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin', 'finance')
        AND is_active = true
    )
  );

-- Internal users (Finance, Admin, Owner) can update statements in their tenant
-- Used for status updates (draft -> sent), email_sent_at, pdf_s3_key
CREATE POLICY "statements_tenant_update" ON public.statements
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin', 'finance')
        AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin', 'finance')
        AND is_active = true
    )
  );

-- ============================================================================
-- AUTHOR PORTAL ACCESS POLICY
-- ============================================================================

-- AC-5.1.5: Portal users (author role) can only SELECT their own statements
-- Uses subquery to resolve author_id from portal_user_id linkage
-- Authors access their statements via author_id -> authors.portal_user_id -> users.clerk_user_id
CREATE POLICY "statements_portal_select" ON public.statements
  FOR SELECT
  TO authenticated
  USING (
    author_id IN (
      SELECT a.id
      FROM public.authors a
      JOIN public.users u ON u.id = a.portal_user_id
      WHERE u.clerk_user_id = auth.user_id()
        AND u.role = 'author'
        AND u.is_active = true
    )
  );

-- ============================================================================
-- NOTES
-- ============================================================================
-- - Statements DELETE is not allowed through RLS (no delete policy)
-- - Editors cannot access statements (read/write)
-- - Authors can only READ their own statements (no insert/update/delete)
-- - The tenant_id foreign key with CASCADE delete handles cleanup when tenant is deleted
