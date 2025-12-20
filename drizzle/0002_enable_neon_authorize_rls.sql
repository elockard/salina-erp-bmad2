-- Enable Row-Level Security on tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old manual RLS policies if they exist
DROP POLICY IF EXISTS tenant_isolation_policy ON public.users;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.tenants;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own user record
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  TO authenticated
  USING (clerk_user_id = auth.user_id());

-- Users can update their own record
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  TO authenticated
  USING (clerk_user_id = auth.user_id())
  WITH CHECK (clerk_user_id = auth.user_id());

-- ============================================================================
-- TENANTS TABLE POLICIES
-- ============================================================================

-- Users can view the tenant they belong to
CREATE POLICY "tenants_select_by_membership" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
    )
  );

-- Only owners and admins can update tenant settings
CREATE POLICY "tenants_update_owner_admin" ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- NOTES
-- ============================================================================
-- These policies use Neon Authorize's auth.user_id() function
-- which is automatically populated from the Clerk JWT token
-- No manual session variables or SET ROLE commands needed
