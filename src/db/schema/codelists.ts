/**
 * EDItEUR ONIX Codelists Schema
 *
 * Database schema for storing ONIX codelists from EDItEUR.
 * Platform-wide tables shared across ALL tenants.
 *
 * Story: 14.4 - Build Codelist Management System
 * Task 1: Create codelists database schema
 * FR: FR138
 *
 * IMPORTANT: Platform-Wide Data Model
 * - No tenant_id - codelists are shared across all tenants
 * - No RLS - Row-level security not applied
 * - Platform admin only - Update operations restricted to platform admins
 * - Read by all - Any authenticated user can read codelist values
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * EDItEUR ONIX Codelists - metadata per list
 *
 * Tracks which codelists have been loaded and their issue versions.
 * Key lists include:
 * - List 5: Product Identifier Type
 * - List 15: Title Type
 * - List 17: Contributor Role
 * - List 27: Subject Scheme
 * - List 150: Product Form
 * - List 196: E-publication Accessibility
 */
export const codelists = pgTable(
  "codelists",
  {
    /** Unique identifier (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** EDItEUR list number (e.g., 5, 15, 17, 27, 150, 196) */
    list_number: integer("list_number").notNull().unique(),

    /** EDItEUR issue number when this list was loaded (e.g., 68) */
    issue_number: integer("issue_number").notNull(),

    /** Human-readable name of the codelist */
    list_name: text("list_name").notNull(),

    /** Number of values in this codelist */
    value_count: integer("value_count").notNull(),

    /** When this codelist was first loaded */
    loaded_at: timestamp("loaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** When this codelist was last updated */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Index on list_number for fast lookup by list number */
    listNumberIdx: index("codelists_list_number_idx").on(table.list_number),
  }),
);

/**
 * Individual codelist values
 *
 * Stores each code and its description for a given list.
 * Used for validation and UI display of human-readable labels.
 */
export const codelistValues = pgTable(
  "codelist_values",
  {
    /** Unique identifier (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** EDItEUR list number this value belongs to */
    list_number: integer("list_number").notNull(),

    /** The code value (e.g., "01", "A01", "BC") */
    code: text("code").notNull(),

    /** Human-readable description of the code */
    description: text("description").notNull(),

    /** Additional notes about the code (optional) */
    notes: text("notes"),

    /** Whether this code has been deprecated */
    deprecated: boolean("deprecated").default(false),

    /** The issue number when this code was added */
    added_in_issue: integer("added_in_issue"),
  },
  (table) => ({
    /** Compound index for looking up specific code in a list */
    listCodeIdx: index("codelist_values_list_code_idx").on(
      table.list_number,
      table.code,
    ),
    /** Index on list_number for fetching all values in a list */
    listNumberIdx: index("codelist_values_list_number_idx").on(
      table.list_number,
    ),
  }),
);

/**
 * TypeScript type for codelists SELECT queries
 */
export type Codelist = typeof codelists.$inferSelect;

/**
 * TypeScript type for codelists INSERT operations
 */
export type InsertCodelist = typeof codelists.$inferInsert;

/**
 * TypeScript type for codelist_values SELECT queries
 */
export type CodelistValue = typeof codelistValues.$inferSelect;

/**
 * TypeScript type for codelist_values INSERT operations
 */
export type InsertCodelistValue = typeof codelistValues.$inferInsert;
