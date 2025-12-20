-- Story 2.6: Create ISBN Pool Database Schema and Tracking
-- RLS policies for isbns table supporting internal tenant users
-- ============================================================================

-- Enable Row-Level Security on isbns table
ALTER TABLE public.isbns ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotency)
DROP POLICY IF EXISTS isbns_tenant_select ON public.isbns;
DROP POLICY IF EXISTS isbns_tenant_insert ON public.isbns;
DROP POLICY IF EXISTS isbns_tenant_update ON public.isbns;

-- ============================================================================
-- ISBNS TABLE POLICIES
-- ============================================================================

-- Internal users can view ISBNs in their tenant
-- owner, admin, editor, finance can view the ISBN pool
CREATE POLICY "isbns_tenant_select" ON public.isbns
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin', 'editor', 'finance')
        AND is_active = true
    )
  );

-- Internal users can insert ISBNs in their tenant
-- Only owner, admin can import new ISBNs
CREATE POLICY "isbns_tenant_insert" ON public.isbns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- Internal users can update ISBNs in their tenant
-- Only owner, admin can modify ISBNs (assignment, status changes)
CREATE POLICY "isbns_tenant_update" ON public.isbns
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- ============================================================================
-- NOTES
-- ============================================================================
-- ISBN pool management is restricted to owner/admin roles.
-- Editors can view but not modify ISBN pool.
-- Finance can view for reporting purposes.
-- Portal users (author role) have no direct ISBN access.
