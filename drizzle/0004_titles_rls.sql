-- Story 2.4: Create Title Database Schema and Multi-Format Support
-- RLS policies for titles table supporting internal tenant users
-- ============================================================================

-- Enable Row-Level Security on titles table
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotency)
DROP POLICY IF EXISTS titles_tenant_select ON public.titles;
DROP POLICY IF EXISTS titles_tenant_insert ON public.titles;
DROP POLICY IF EXISTS titles_tenant_update ON public.titles;

-- ============================================================================
-- TITLES TABLE POLICIES
-- ============================================================================

-- Internal users (non-author roles) can view all titles in their tenant
-- This allows owner, admin, editor, finance to view the title catalog
CREATE POLICY "titles_tenant_select" ON public.titles
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

-- Internal users can insert titles in their tenant
-- Only owner, admin, editor can create new titles
CREATE POLICY "titles_tenant_insert" ON public.titles
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

-- Internal users can update titles in their tenant
-- Only owner, admin, editor can modify titles
CREATE POLICY "titles_tenant_update" ON public.titles
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

-- ============================================================================
-- NOTES
-- ============================================================================
-- Portal users (author role) cannot directly access titles table in MVP.
-- Future enhancement (post-MVP): Add policy for portal users if author-specific
-- title views are needed. Pattern would be:
--
-- CREATE POLICY "titles_portal_select" ON public.titles
--   FOR SELECT
--   TO authenticated
--   USING (
--     author_id IN (
--       SELECT a.id
--       FROM public.authors a
--       JOIN public.users u ON u.id = a.portal_user_id
--       WHERE u.clerk_user_id = auth.user_id()
--         AND u.role = 'author'
--         AND u.is_active = true
--     )
--   );
