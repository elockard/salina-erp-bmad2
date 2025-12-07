/**
 * ISBN Prefixes Schema
 *
 * Database schema for publisher ISBN prefix registration and management.
 * Enables bulk ISBN generation from registered publisher prefixes.
 *
 * Related FRs: FR88, FR89, FR90, FR91, FR92 (Enhanced ISBN Management)
 * Epic: Epic 7 - Contact & ISBN Foundation
 * Story: 7.4 - Implement Publisher ISBN Prefix System
 *
 * Architecture References:
 * - architecture.md (ISBN Management section)
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary (see migration SQL)
 */

import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Valid block sizes for ISBN prefix registration
 * Each value represents the number of ISBNs to generate from the prefix
 */
export const isbnPrefixBlockSizes = [
  10, 100, 1000, 10000, 100000, 1000000,
] as const;

export type IsbnPrefixBlockSize = (typeof isbnPrefixBlockSizes)[number];

/**
 * Generation status values - tracks ISBN generation lifecycle
 * - pending: Prefix registered, ISBNs not yet generated
 * - generating: ISBN generation in progress (async job running)
 * - completed: All ISBNs generated successfully
 * - failed: Generation failed, see generation_error for details
 */
export const isbnPrefixGenerationStatusValues = [
  "pending",
  "generating",
  "completed",
  "failed",
] as const;

export type IsbnPrefixGenerationStatus =
  (typeof isbnPrefixGenerationStatusValues)[number];

/**
 * ISBN Prefixes table - Stores registered publisher ISBN prefixes
 *
 * Primary use cases:
 * - Register publisher ISBN prefixes (e.g., "978-1-234567")
 * - Track ISBN generation status
 * - Organize ISBN pool by prefix
 * - Calculate availability by prefix
 */
export const isbnPrefixes = pgTable(
  "isbn_prefixes",
  {
    /** Unique identifier for the prefix record (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /**
     * Publisher ISBN prefix (e.g., "978-1-234567")
     * Must start with 978 or 979 (GS1 prefixes for ISBN)
     * Length: 7-12 digits (normalized, without hyphens)
     */
    prefix: text("prefix").notNull(),

    /**
     * Number of ISBNs in this block
     * Must be one of: 10, 100, 1000, 10000, 100000, 1000000
     */
    block_size: integer("block_size").notNull(),

    /**
     * Type of ISBNs - physical or ebook
     * @deprecated Story 7.6: ISBN type distinction removed. Field kept for migration rollback.
     * Matches the type in isbns table
     */
    type: text("type", { enum: ["physical", "ebook"] }),

    /** Optional user-friendly description for the prefix */
    description: text("description"),

    /** Total number of ISBNs in this block (same as block_size) */
    total_isbns: integer("total_isbns").notNull(),

    /** Number of ISBNs currently available (not assigned) */
    available_count: integer("available_count").notNull(),

    /** Number of ISBNs assigned to titles */
    assigned_count: integer("assigned_count").notNull().default(0),

    /** Current generation status */
    generation_status: text("generation_status", {
      enum: isbnPrefixGenerationStatusValues,
    })
      .notNull()
      .default("pending"),

    /** Error message if generation failed */
    generation_error: text("generation_error"),

    /** User who created this prefix registration */
    created_by_user_id: uuid("created_by_user_id").references(() => users.id),

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
    /** Unique constraint: same prefix can't be registered twice per tenant */
    tenantPrefixUnique: unique("isbn_prefixes_tenant_prefix_unique").on(
      table.tenant_id,
      table.prefix,
    ),

    /** Index on tenant_id for RLS filtering and query performance */
    tenantIdIdx: index("isbn_prefixes_tenant_id_idx").on(table.tenant_id),

    /** Index on generation_status for filtering pending/generating jobs */
    statusIdx: index("isbn_prefixes_generation_status_idx").on(
      table.generation_status,
    ),
  }),
);

/**
 * TypeScript type for SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type IsbnPrefix = typeof isbnPrefixes.$inferSelect;

/**
 * TypeScript type for INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type NewIsbnPrefix = typeof isbnPrefixes.$inferInsert;
