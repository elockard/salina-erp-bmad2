/**
 * Authors Schema
 *
 * Database schema for author management in the Salina ERP system.
 * Authors are managed at the tenant level with multi-tenant isolation via RLS.
 *
 * Related FRs: FR9-FR13 (Author Management)
 * Epic: Epic 2 - Author & Title Catalog Management
 * Story: 2.1 - Create Author Database Schema and Data Model
 *
 * Architecture References:
 * - architecture.md lines 1571-1589 (Authors table specification)
 * - architecture.md lines 481-579 (Multi-tenant RLS patterns)
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary (see migration SQL)
 *
 * Soft Delete Pattern:
 * - Physical DELETE operations are NOT ALLOWED
 * - Use UPDATE to set is_active = false for deactivation
 * - Queries default to WHERE is_active = true unless fetching inactive records
 *
 * Tax ID Encryption:
 * - Column created as TEXT (nullable)
 * - Encryption implementation deferred to Story 2.2 (app-level or pgcrypto)
 * - Will be encrypted before insert and decrypted on read in Server Actions
 */

import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Authors table - Stores author information for royalty management
 *
 * Primary use cases:
 * - Author profile management (name, contact info)
 * - Tax ID storage for 1099 reporting (encrypted at rest)
 * - Payment method preferences for royalty disbursement
 * - Audit trail via created_at/updated_at timestamps
 * - Soft delete via is_active flag
 */
export const authors = pgTable(
  "authors",
  {
    /** Unique identifier for the author (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Author's full name (required) */
    name: text("name").notNull(),

    /** Author's email address (optional, nullable, no uniqueness constraint across tenants) */
    email: text("email"),

    /** Author's phone number (optional, nullable) */
    phone: text("phone"),

    /** Author's mailing address (optional, nullable) */
    address: text("address"),

    /**
     * Tax ID for 1099 reporting (optional, nullable)
     * NOTE: Stored as TEXT, encryption deferred to Story 2.2
     * Will be encrypted before insert using app-level encryption or pgcrypto
     */
    tax_id: text("tax_id"),

    /**
     * Preferred payment method for royalty disbursement (optional, nullable)
     * Valid values: 'direct_deposit', 'check', 'wire_transfer'
     * Validation enforced at application layer via Zod schema (Story 2.2)
     */
    payment_method: text("payment_method"),

    /**
     * Foreign key to users table - links author to their portal user account
     * Used for Story 2.3: Author Portal Access Provisioning
     * - Nullable: Authors may not have portal access
     * - Unique: One author can only have one portal user account
     */
    portal_user_id: uuid("portal_user_id").references(() => users.id),

    /**
     * Soft delete flag - indicates if author is active or deactivated
     * Default: true
     * NOTE: Do NOT use physical DELETE - set to false for deactivation
     */
    is_active: boolean("is_active").notNull().default(true),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Last update timestamp (UTC, auto-updated on changes) */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Index on tenant_id for foreign key join performance */
    tenantIdIdx: index("authors_tenant_id_idx").on(table.tenant_id),

    /** Index on email for search functionality */
    emailIdx: index("authors_email_idx").on(table.email),

    /** Index on is_active for filtering active/inactive authors */
    isActiveIdx: index("authors_is_active_idx").on(table.is_active),

    /** Composite index for efficient tenant-scoped active author queries */
    tenantActiveIdx: index("authors_tenant_id_is_active_idx").on(
      table.tenant_id,
      table.is_active,
    ),

    /** Unique constraint on portal_user_id - one author can only have one portal user */
    portalUserUnique: unique("authors_portal_user_id_unique").on(
      table.portal_user_id,
    ),
  }),
);

/**
 * TypeScript type for SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type Author = typeof authors.$inferSelect;

/**
 * TypeScript type for INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertAuthor = typeof authors.$inferInsert;
