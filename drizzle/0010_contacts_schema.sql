-- Story 7.1: Create Unified Contact Database Schema
-- Creates contacts and contact_roles tables for unified contact management

CREATE TABLE "contact_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"role" text NOT NULL,
	"role_specific_data" jsonb,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	CONSTRAINT "contact_roles_contact_role_unique" UNIQUE("contact_id","role"),
	CONSTRAINT "contact_roles_role_valid" CHECK (role IN ('author', 'customer', 'vendor', 'distributor'))
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text DEFAULT 'USA',
	"tax_id" text,
	"payment_info" jsonb,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"portal_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "contacts_tenant_email_unique" UNIQUE("tenant_id","email"),
	CONSTRAINT "contacts_portal_user_unique" UNIQUE("portal_user_id"),
	CONSTRAINT "contacts_status_valid" CHECK (status IN ('active', 'inactive'))
);
--> statement-breakpoint
ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_portal_user_id_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_roles_contact_id_idx" ON "contact_roles" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_roles_role_idx" ON "contact_roles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "contacts_tenant_id_idx" ON "contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contacts_tenant_status_idx" ON "contacts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "contacts_name_idx" ON "contacts" USING btree ("last_name","first_name");

-- =============================================================================
-- RLS POLICIES for Contacts (Story 7.1)
-- =============================================================================
-- Enable RLS on contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy for contacts
CREATE POLICY contacts_tenant_isolation ON contacts
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Note: contact_roles inherits isolation via FK CASCADE (no separate policy needed)
-- When contact is deleted, all roles CASCADE delete automatically

-- =============================================================================
-- updated_at TRIGGER (auto-update on modification)
-- =============================================================================
-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for contacts table
CREATE TRIGGER contacts_updated_at_trigger
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROLLBACK INSTRUCTIONS:
-- =============================================================================
-- DROP TRIGGER IF EXISTS contacts_updated_at_trigger ON contacts;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP POLICY IF EXISTS contacts_tenant_isolation ON contacts;
-- DROP TABLE IF EXISTS contact_roles;
-- DROP TABLE IF EXISTS contacts;
