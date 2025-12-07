/**
 * Contacts Schema
 *
 * Database schema for unified contact management with multi-role support.
 * Contacts can serve as Authors, Customers, Vendors, or Distributors.
 *
 * Related FRs: FR82-FR87 (Contact Management)
 * Epic: Epic 7 - Contact & ISBN Foundation
 * Story: 7.1 - Create Unified Contact Database Schema
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 *
 * Role System:
 * - contacts table: Core contact information (name, email, address, etc.)
 * - contact_roles table: Multi-role support (author, customer, vendor, distributor)
 * - Each contact can have multiple roles with role-specific data in JSONB
 *
 * @see src/db/schema/authors.ts for existing pattern reference
 */

import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Contact status values
 * - active: Contact is currently active and can be used
 * - inactive: Contact is deactivated (soft delete pattern)
 */
export const contactStatusValues = ["active", "inactive"] as const;

export type ContactStatus = (typeof contactStatusValues)[number];

/**
 * Contact role type values
 * - author: Can receive royalty payments, linked to titles/contracts
 * - customer: Can be invoiced, tracked in AR
 * - vendor: Supplier of goods/services
 * - distributor: Distribution channel partner
 */
export const contactRoleValues = [
  "author",
  "customer",
  "vendor",
  "distributor",
] as const;

export type ContactRoleType = (typeof contactRoleValues)[number];

/**
 * Contacts table - Unified contact database with multi-role support
 *
 * Primary use cases:
 * - Contact profile management (name, contact info, address)
 * - Tax ID storage for 1099 reporting (encrypted at app level)
 * - Payment method preferences for royalty disbursement
 * - Author portal access via portal_user_id
 * - Audit trail via created_at/updated_at timestamps
 * - Soft delete via status='inactive'
 *
 * Business Rules:
 * - Email must be unique per tenant (composite unique constraint)
 * - portal_user_id is unique (one user can only link to one contact)
 * - Contact roles managed via contact_roles table
 */
export const contacts = pgTable(
  "contacts",
  {
    /** Unique identifier for the contact (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Contact's first name (required) */
    first_name: text("first_name").notNull(),

    /** Contact's last name (required) */
    last_name: text("last_name").notNull(),

    /** Contact's email address (optional, unique per tenant) */
    email: text("email"),

    /** Contact's phone number (optional) */
    phone: text("phone"),

    /** Address line 1 (street address) */
    address_line1: text("address_line1"),

    /** Address line 2 (apt, suite, etc.) */
    address_line2: text("address_line2"),

    /** City */
    city: text("city"),

    /** State/Province */
    state: text("state"),

    /** Postal/ZIP code */
    postal_code: text("postal_code"),

    /** Country (defaults to USA) */
    country: text("country").default("USA"),

    /**
     * Tax ID for 1099 reporting (optional, nullable)
     * NOTE: Encrypted at application level before storage
     */
    tax_id: text("tax_id"),

    /**
     * Payment information for royalty disbursement (optional)
     * Stored as JSONB with type-safe structure defined in types.ts
     * Example: { method: 'direct_deposit', bank_name: '...', ... }
     */
    payment_info: jsonb("payment_info"),

    /** General notes about the contact */
    notes: text("notes"),

    /**
     * Contact status
     * Default: active
     * Valid values: active, inactive (enforced by CHECK constraint)
     */
    status: text("status").notNull().default("active"),

    /**
     * Foreign key to users table - links contact to their portal user account
     * Used for author portal access
     * - Nullable: Contacts may not have portal access
     * - Unique: One contact can only have one portal user account
     */
    portal_user_id: uuid("portal_user_id").references(() => users.id),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * Last update timestamp (UTC)
     * Defaults to now() on INSERT.
     * AUTO-UPDATED via database trigger `contacts_updated_at_trigger`
     * (see migration 0010_contacts_schema.sql for trigger definition)
     */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** User who created this contact (optional, for audit trail) */
    created_by: uuid("created_by").references(() => users.id),
  },
  (table) => ({
    /** Index on tenant_id for foreign key join performance */
    tenantIdIdx: index("contacts_tenant_id_idx").on(table.tenant_id),

    /** Index on email for search functionality */
    emailIdx: index("contacts_email_idx").on(table.email),

    /** Index on status for filtering active/inactive contacts */
    statusIdx: index("contacts_status_idx").on(table.status),

    /** Composite index for efficient tenant-scoped status queries */
    tenantStatusIdx: index("contacts_tenant_status_idx").on(
      table.tenant_id,
      table.status,
    ),

    /** Index on name for search functionality */
    nameIdx: index("contacts_name_idx").on(table.last_name, table.first_name),

    /**
     * Unique constraint on (tenant_id, email) - email must be unique per tenant
     * NOTE: Per SQL standard, NULL values are NOT considered equal in unique constraints.
     * This means multiple contacts with email=NULL are allowed in the same tenant.
     * This is intentional - contacts without email addresses are valid.
     */
    tenantEmailUnique: unique("contacts_tenant_email_unique").on(
      table.tenant_id,
      table.email,
    ),

    /** Unique constraint on portal_user_id - one contact can only have one portal user */
    portalUserUnique: unique("contacts_portal_user_unique").on(
      table.portal_user_id,
    ),

    /** CHECK constraint: status must be 'active' or 'inactive' */
    statusValid: check(
      "contacts_status_valid",
      sql`status IN ('active', 'inactive')`,
    ),
  }),
);

/**
 * Contact Roles table - Multi-role support for contacts
 *
 * Each contact can have multiple roles (author, customer, vendor, distributor).
 * Role-specific data is stored in the role_specific_data JSONB column.
 *
 * Business Rules:
 * - One role per type per contact (unique constraint on contact_id, role)
 * - Inherits tenant isolation via CASCADE delete from contacts
 * - No separate RLS needed - isolation enforced via FK
 *
 * Primary use cases:
 * - Assigning multiple roles to a single contact
 * - Storing role-specific information (pen_name for authors, territory for distributors)
 * - Tracking when roles were assigned and by whom
 */
export const contactRoles = pgTable(
  "contact_roles",
  {
    /** Unique identifier for the role assignment (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /**
     * Foreign key to contacts table
     * ON DELETE CASCADE - deleting a contact removes all its roles
     */
    contact_id: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),

    /**
     * Role type
     * Valid values: author, customer, vendor, distributor
     * Enforced by CHECK constraint
     */
    role: text("role").notNull(),

    /**
     * Role-specific data stored as JSONB
     * Structure varies by role type - see types.ts for definitions
     * - Author: { pen_name, bio, website, social_links }
     * - Customer: { billing_address, shipping_address, credit_limit, payment_terms }
     * - Vendor: { vendor_code, lead_time_days, min_order_amount }
     * - Distributor: { territory, commission_rate, contract_terms }
     */
    role_specific_data: jsonb("role_specific_data"),

    /** When the role was assigned (UTC, auto-generated) */
    assigned_at: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** User who assigned this role (optional, for audit trail) */
    assigned_by: uuid("assigned_by").references(() => users.id),
  },
  (table) => ({
    /** Index on contact_id for join performance */
    contactIdIdx: index("contact_roles_contact_id_idx").on(table.contact_id),

    /** Index on role for filtering by role type */
    roleIdx: index("contact_roles_role_idx").on(table.role),

    /** Unique constraint: one role per type per contact */
    contactRoleUnique: unique("contact_roles_contact_role_unique").on(
      table.contact_id,
      table.role,
    ),

    /** CHECK constraint: role must be a valid role type */
    roleValid: check(
      "contact_roles_role_valid",
      sql`role IN ('author', 'customer', 'vendor', 'distributor')`,
    ),
  }),
);

/**
 * TypeScript type for contacts SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type Contact = typeof contacts.$inferSelect;

/**
 * TypeScript type for contacts INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertContact = typeof contacts.$inferInsert;

/**
 * TypeScript type for contact_roles SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type ContactRole = typeof contactRoles.$inferSelect;

/**
 * TypeScript type for contact_roles INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertContactRole = typeof contactRoles.$inferInsert;
