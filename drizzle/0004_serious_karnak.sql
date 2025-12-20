CREATE TABLE "isbns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"isbn_13" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"assigned_to_title_id" uuid,
	"assigned_at" timestamp with time zone,
	"assigned_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "isbns_isbn_13_unique" UNIQUE("isbn_13")
);
--> statement-breakpoint
ALTER TABLE "isbns" ADD CONSTRAINT "isbns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isbns" ADD CONSTRAINT "isbns_assigned_to_title_id_titles_id_fk" FOREIGN KEY ("assigned_to_title_id") REFERENCES "public"."titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isbns" ADD CONSTRAINT "isbns_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "isbns_tenant_id_idx" ON "isbns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "isbns_status_idx" ON "isbns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "isbns_type_idx" ON "isbns" USING btree ("type");--> statement-breakpoint
CREATE INDEX "isbns_assigned_to_title_id_idx" ON "isbns" USING btree ("assigned_to_title_id");

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