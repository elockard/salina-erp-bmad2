-- Story 3.4: Create Returns Database Schema with Approval Workflow
-- RLS policies for returns table supporting tenant isolation and role-based access
-- ============================================================================

-- Enable Row-Level Security on returns table
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotency)
DROP POLICY IF EXISTS returns_tenant_select ON public.returns;
DROP POLICY IF EXISTS returns_tenant_insert ON public.returns;
DROP POLICY IF EXISTS returns_tenant_update ON public.returns;

-- ============================================================================
-- RETURNS TABLE POLICIES
-- ============================================================================

-- Internal users can view returns in their tenant
-- owner, admin, editor, finance can view returns
CREATE POLICY "returns_tenant_select" ON public.returns
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

-- Internal users can insert returns in their tenant
-- owner, admin, editor can create return requests
CREATE POLICY "returns_tenant_insert" ON public.returns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin', 'editor')
        AND is_active = true
    )
  );

-- Internal users can update returns in their tenant
-- owner, admin, finance can update returns (approve/reject workflow)
-- FR35: Finance role approves/rejects returns
CREATE POLICY "returns_tenant_update" ON public.returns
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
-- NOTES
-- ============================================================================
-- Returns follow approval workflow (FR32-FR36):
-- - pending: New returns awaiting approval (created by owner/admin/editor)
-- - approved: Finance approves, affects royalty calculations
-- - rejected: Finance rejects, excluded from calculations
--
-- Role access:
-- - owner, admin: Full CRUD access
-- - editor: Can create return requests, can view, cannot approve/reject
-- - finance: Can view and update (approve/reject), cannot create
-- - author (portal): No direct returns access
