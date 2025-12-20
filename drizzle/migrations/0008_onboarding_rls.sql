-- Story 20.1: Build Onboarding Wizard
-- RLS policies for onboarding_progress table
-- ============================================================================
-- Ensures tenant isolation for onboarding data
-- ============================================================================

-- Enable Row-Level Security on onboarding_progress table
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (for idempotent migration)
DROP POLICY IF EXISTS onboarding_progress_tenant_select ON public.onboarding_progress;
DROP POLICY IF EXISTS onboarding_progress_tenant_insert ON public.onboarding_progress;
DROP POLICY IF EXISTS onboarding_progress_tenant_update ON public.onboarding_progress;

-- ============================================================================
-- ONBOARDING_PROGRESS TABLE POLICIES
-- ============================================================================

-- All authenticated internal users can view their tenant's onboarding progress
CREATE POLICY "onboarding_progress_tenant_select" ON public.onboarding_progress
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND is_active = true
    )
  );

-- All authenticated internal users can insert onboarding progress for their tenant
CREATE POLICY "onboarding_progress_tenant_insert" ON public.onboarding_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND is_active = true
    )
  );

-- All authenticated internal users can update their tenant's onboarding progress
CREATE POLICY "onboarding_progress_tenant_update" ON public.onboarding_progress
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND is_active = true
    )
  );

-- ============================================================================
-- NOTES
-- ============================================================================
-- - DELETE is not allowed through RLS (no delete policy)
-- - All internal roles can access onboarding (owner, admin, editor, finance)
-- - Author portal users cannot access onboarding (they don't need it)
-- - The tenant_id foreign key with CASCADE delete handles cleanup when tenant is deleted
