/**
 * CSV Imports Schema
 *
 * Database schema for tracking CSV import history.
 * Stores import metadata for audit trail.
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 5: Create import tracking schema
 *
 * FRs: FR170, FR171
 *
 * Pattern from: src/db/schema/onix-imports.ts
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
import type {
  ColumnMapping,
  ImportResultSummary,
} from "@/modules/import-export/types";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Import status values
 * - success: Import completed successfully
 * - partial: Some rows imported, some skipped/failed
 * - failed: Import failed entirely
 */
export const csvImportStatusValues = ["success", "partial", "failed"] as const;

export type CsvImportStatus = (typeof csvImportStatusValues)[number];

/**
 * Import type values
 * - titles: Title catalog import
 * - contacts: Contact/author import
 * - sales: Sales data import
 */
export const csvImportTypeValues = ["titles", "contacts", "sales"] as const;

/**
 * Import mode values (Story 19.4 - Bulk Update via CSV)
 * - create: Only create new records (standard import)
 * - update: Only update existing records (bulk update)
 * - upsert: Create or update records (mixed mode)
 */
export const csvImportModeValues = ["create", "update", "upsert"] as const;

export type CsvImportMode = (typeof csvImportModeValues)[number];

/**
 * Update detail entry for field-level change tracking
 * Used for audit logging of bulk updates
 */
export interface UpdateDetailEntry {
  titleId: string;
  isbn: string;
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

export type CsvImportType = (typeof csvImportTypeValues)[number];

/**
 * CSV Imports table - Tracks import history
 *
 * Primary use cases:
 * - Audit trail for CSV imports
 * - Import history view for publishers
 * - Troubleshooting failed imports
 * - Undo capability via created_title_ids
 *
 * Business Rules:
 * - One row per import operation
 * - Tracks counts for imported, skipped, and failed rows
 * - Links to user who performed the import
 * - Stores column mappings for reference
 */
export const csvImports = pgTable(
  "csv_imports",
  {
    /** Unique identifier for the import (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Original filename of the uploaded file */
    filename: text("filename").notNull(),

    /** Type of import (titles, contacts, sales) */
    import_type: text("import_type", {
      enum: csvImportTypeValues,
    }).notNull(),

    /** Total number of rows in the source file (excluding header) */
    total_rows: integer("total_rows").notNull(),

    /** Number of rows successfully imported */
    imported_count: integer("imported_count").notNull(),

    /** Number of rows skipped (validation errors or user choice) */
    skipped_count: integer("skipped_count").notNull().default(0),

    /** Number of rows updated (if update mode) */
    updated_count: integer("updated_count").notNull().default(0),

    /** Number of rows that failed to import */
    error_count: integer("error_count").notNull().default(0),

    /** Import status */
    status: text("status", {
      enum: csvImportStatusValues,
    }).notNull(),

    /** Error message if status is failed */
    error_message: text("error_message"),

    /** Array of created title IDs (for undo capability) */
    created_title_ids: uuid("created_title_ids").array(),

    /**
     * Array of updated title IDs (for audit trail)
     * Story 19.4 - Bulk Update via CSV
     */
    updated_title_ids: uuid("updated_title_ids").array(),

    /**
     * Import mode: create, update, or upsert
     * Story 19.4 - Bulk Update via CSV
     */
    import_mode: text("import_mode", {
      enum: csvImportModeValues,
    }),

    /**
     * Field-level change tracking for bulk updates
     * Story 19.4 - Bulk Update via CSV
     */
    update_details: jsonb("update_details").$type<UpdateDetailEntry[]>(),

    /** Detailed results as JSON for debugging */
    result_details: jsonb("result_details").$type<ImportResultSummary>(),

    /** Column mappings used for this import */
    column_mappings: jsonb("column_mappings").$type<ColumnMapping[]>(),

    /** User who initiated the import */
    imported_by: uuid("imported_by").references(() => users.id),

    /** When the import was created */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** When the import completed */
    completed_at: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    /** Index on tenant_id for foreign key join performance and RLS */
    tenantIdIdx: index("csv_imports_tenant_id_idx").on(table.tenant_id),

    /** Index on created_at for chronological queries */
    createdAtIdx: index("csv_imports_created_at_idx").on(table.created_at),

    /** Index on status for filtering by import status */
    statusIdx: index("csv_imports_status_idx").on(table.status),

    /** Composite index for tenant + date queries (common pattern) */
    tenantCreatedIdx: index("csv_imports_tenant_created_idx").on(
      table.tenant_id,
      table.created_at,
    ),

    /** Index on import_type for filtering */
    importTypeIdx: index("csv_imports_import_type_idx").on(table.import_type),
  }),
);

/**
 * TypeScript type for csv_imports SELECT queries (read operations)
 */
export type CsvImport = typeof csvImports.$inferSelect;

/**
 * TypeScript type for csv_imports INSERT operations (create operations)
 */
export type InsertCsvImport = typeof csvImports.$inferInsert;
