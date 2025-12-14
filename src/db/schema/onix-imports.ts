/**
 * ONIX Imports Schema
 *
 * Database schema for tracking ONIX import history.
 * Stores import metadata for audit trail.
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 7: Create import database schema
 * FR: FR139, FR140
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Import status values
 * - success: Import completed successfully
 * - partial: Some products imported, some skipped/failed
 * - failed: Import failed entirely
 */
export const onixImportStatusValues = ["success", "partial", "failed"] as const;

export type OnixImportStatus = (typeof onixImportStatusValues)[number];

/**
 * ONIX version values supported for import
 */
export const onixVersionValues = ["2.1", "3.0", "3.1"] as const;

export type OnixVersionValue = (typeof onixVersionValues)[number];

/**
 * Import result summary structure
 */
export interface ImportResultSummary {
  imported: number;
  skipped: number;
  updated: number;
  errors: number;
  conflicts: number;
}

/**
 * ONIX Imports table - Tracks import history
 *
 * Primary use cases:
 * - Audit trail for ONIX imports
 * - Import history view for publishers
 * - Troubleshooting failed imports
 *
 * Business Rules:
 * - One row per import operation
 * - Tracks counts for imported, skipped, and failed products
 * - Links to user who performed the import
 */
export const onixImports = pgTable(
  "onix_imports",
  {
    /** Unique identifier for the import (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Original filename of the uploaded file */
    filename: text("filename").notNull(),

    /** Detected ONIX version (2.1, 3.0, or 3.1) */
    onix_version: text("onix_version", {
      enum: onixVersionValues,
    }).notNull(),

    /** Total number of products in the source file */
    total_products: integer("total_products").notNull(),

    /** Number of products successfully imported */
    imported_count: integer("imported_count").notNull(),

    /** Number of products skipped (conflicts or user choice) */
    skipped_count: integer("skipped_count").notNull().default(0),

    /** Number of products updated (conflict resolution) */
    updated_count: integer("updated_count").notNull().default(0),

    /** Number of products that failed to import */
    error_count: integer("error_count").notNull().default(0),

    /** Import status */
    status: text("status", {
      enum: onixImportStatusValues,
    }).notNull(),

    /** Error message if status is failed */
    error_message: text("error_message"),

    /** Array of created title IDs */
    created_title_ids: uuid("created_title_ids").array(),

    /** Array of created contact IDs */
    created_contact_ids: uuid("created_contact_ids").array(),

    /** Detailed results as JSON for debugging */
    result_details: jsonb("result_details").$type<ImportResultSummary>(),

    /** User who initiated the import */
    imported_by: uuid("imported_by").references(() => users.id),

    /** When the import was created */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Index on tenant_id for foreign key join performance and RLS */
    tenantIdIdx: index("onix_imports_tenant_id_idx").on(table.tenant_id),

    /** Index on created_at for chronological queries */
    createdAtIdx: index("onix_imports_created_at_idx").on(table.created_at),

    /** Index on status for filtering by import status */
    statusIdx: index("onix_imports_status_idx").on(table.status),

    /** Composite index for tenant + date queries */
    tenantCreatedIdx: index("onix_imports_tenant_created_idx").on(
      table.tenant_id,
      table.created_at,
    ),
  }),
);

/**
 * TypeScript type for onix_imports SELECT queries (read operations)
 */
export type OnixImport = typeof onixImports.$inferSelect;

/**
 * TypeScript type for onix_imports INSERT operations (create operations)
 */
export type InsertOnixImport = typeof onixImports.$inferInsert;
