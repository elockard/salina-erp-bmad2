-- Story 2.3: Author Portal Access Provisioning
-- RLS policies for authors table supporting both internal and portal users
-- ============================================================================

-- Enable Row-Level Security on authors table
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS authors_tenant_isolation ON public.authors;
DROP POLICY IF EXISTS authors_portal_select ON public.authors;

-- ============================================================================
-- AUTHORS TABLE POLICIES
-- ============================================================================

-- AC 27: Internal users (non-author roles) can view all authors in their tenant
-- This allows owner, admin, editor, finance to manage authors
CREATE POLICY "authors_tenant_select" ON public.authors
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

-- Internal users can insert authors in their tenant
CREATE POLICY "authors_tenant_insert" ON public.authors
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

-- Internal users can update authors in their tenant
CREATE POLICY "authors_tenant_update" ON public.authors
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin', 'editor')
        AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin', 'editor')
        AND is_active = true
    )
  );

-- AC 27: Portal users (author role) can only SELECT their own linked author record
-- Uses the portal_user_id column to link author to their user record
CREATE POLICY "authors_portal_select" ON public.authors
  FOR SELECT
  TO authenticated
  USING (
    portal_user_id IN (
      SELECT id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role = 'author'
        AND is_active = true
    )
  );

-- ============================================================================
-- USERS TABLE POLICIES UPDATE
-- ============================================================================
-- Add policy for internal users to view other users in same tenant
-- (Required for admin/management functions)

DROP POLICY IF EXISTS users_tenant_select ON public.users;

CREATE POLICY "users_tenant_select" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    -- User can see themselves (always)
    clerk_user_id = auth.user_id()
    OR
    -- Or user can see others in same tenant if they have appropriate role
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
-- AC 28: RLS policy for royalty_statements table is deferred to Epic 5
-- when that table is created. The pattern will follow:
-- - Tenant users: SELECT WHERE tenant_id matches their tenant
-- - Portal users: SELECT WHERE author_id links to their portal_user_id
