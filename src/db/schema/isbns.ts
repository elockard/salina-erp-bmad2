/**
 * ISBNs Schema
 *
 * Database schema for ISBN pool management in the Salina ERP system.
 * Manages publisher ISBN inventory with status tracking and assignment.
 *
 * Related FRs: FR17, FR19, FR23 (ISBN Pool Management)
 * Epic: Epic 2 - Author & Title Catalog Management
 * Story: 2.6 - Create ISBN Pool Database Schema and Tracking
 *
 * Architecture References:
 * - architecture.md lines 1614-1633 (ISBNs table specification)
 * - tech-spec-epic-2.md (ISBN Pool Management)
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary (see migration SQL)
 *
 * ISBN Global Uniqueness:
 * - ISBN-13 identifiers are industry-standard and globally unique
 * - Unique constraint is NOT tenant-scoped (spans all tenants)
 * - Prevents duplicate ISBN assignment across publishers
 */

import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { isbnPrefixes } from "./isbn-prefixes";
import { tenants } from "./tenants";
import { titles } from "./titles";
import { users } from "./users";

/**
 * ISBN type values - indicates format the ISBN is for
 * - physical: Physical book (print edition)
 * - ebook: Electronic book (digital edition)
 * @deprecated Story 7.6: ISBN type distinction removed. Field kept for migration rollback.
 */
export const isbnTypeValues = ["physical", "ebook"] as const;

/** @deprecated Story 7.6: ISBN type distinction removed */
export type ISBNType = (typeof isbnTypeValues)[number];

/**
 * ISBN status values - tracks ISBN through its lifecycle
 * - available: ISBN in pool, not assigned to any title
 * - assigned: ISBN assigned to a title, awaiting registration
 * - registered: ISBN registered with external agency (Bowker, etc.)
 * - retired: ISBN no longer in use (removed from pool)
 */
export const isbnStatusValues = [
  "available",
  "assigned",
  "registered",
  "retired",
] as const;

export type ISBNStatus = (typeof isbnStatusValues)[number];

/**
 * ISBNs table - Stores ISBN pool for publisher inventory management
 *
 * Primary use cases:
 * - ISBN pool tracking (import, status management)
 * - ISBN assignment to titles (Story 2.9)
 * - ISBN availability queries
 * - Audit trail via created_at/updated_at timestamps
 */
export const isbns = pgTable(
  "isbns",
  {
    /** Unique identifier for the ISBN record (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /**
     * ISBN-13 identifier (industry standard)
     * Globally unique across ALL tenants - not tenant-scoped
     */
    isbn_13: text("isbn_13").notNull().unique(),

    /**
     * Type of ISBN - physical or ebook
     * @deprecated Story 7.6: ISBN type distinction removed. Field kept for migration rollback.
     * Enforced via text enum at database level
     */
    type: text("type", { enum: isbnTypeValues }),

    /**
     * Status of ISBN in pool lifecycle
     * Enforced via text enum at database level
     * Defaults to 'available' when imported into pool
     */
    status: text("status", { enum: isbnStatusValues })
      .notNull()
      .default("available"),

    /**
     * Foreign key to titles table - set when ISBN is assigned
     * Nullable - null when status is 'available'
     */
    assigned_to_title_id: uuid("assigned_to_title_id").references(
      () => titles.id,
    ),

    /** Timestamp when ISBN was assigned to a title */
    assigned_at: timestamp("assigned_at", { withTimezone: true }),

    /**
     * Foreign key to users table - who performed the assignment
     * Nullable - null when status is 'available'
     */
    assigned_by_user_id: uuid("assigned_by_user_id").references(() => users.id),

    /**
     * Foreign key to isbn_prefixes table - links ISBN to its source prefix
     * Nullable - null for legacy imported ISBNs (before prefix system)
     * Story 7.4: Publisher ISBN Prefix System
     */
    prefix_id: uuid("prefix_id").references(() => isbnPrefixes.id),

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
    /** Index on tenant_id for RLS filtering and query performance */
    tenantIdIdx: index("isbns_tenant_id_idx").on(table.tenant_id),

    /** Index on status for filtering by availability */
    statusIdx: index("isbns_status_idx").on(table.status),

    /**
     * Index on type for filtering by physical/ebook
     * @deprecated Story 7.6: Type index no longer used - ISBNs are unified
     */
    // typeIdx: index("isbns_type_idx").on(table.type),

    /** Index on assigned_to_title_id for title lookups */
    assignedTitleIdx: index("isbns_assigned_to_title_id_idx").on(
      table.assigned_to_title_id,
    ),

    /** Index on prefix_id for prefix-based filtering (Story 7.4) */
    prefixIdIdx: index("isbns_prefix_id_idx").on(table.prefix_id),
  }),
);

/**
 * TypeScript type for SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type ISBN = typeof isbns.$inferSelect;

/**
 * TypeScript type for INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type NewISBN = typeof isbns.$inferInsert;
