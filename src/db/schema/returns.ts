/**
 * Returns Schema
 *
 * Database schema for returns tracking with approval workflow in the Salina ERP system.
 * Returns are recorded at the tenant level with multi-tenant isolation via RLS.
 * Implements approval workflow: pending -> approved/rejected
 *
 * Related FRs: FR30-FR37 (Returns Management)
 * Epic: Epic 3 - Sales & Returns Processing
 * Story: 3.4 - Create Returns Database Schema with Approval Workflow
 *
 * Architecture References:
 * - architecture.md lines 1672-1699 (Returns table specification)
 * - prd.md FR30-FR37 (Returns requirements)
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary (see migration SQL)
 *
 * Approval Workflow:
 * - FR32: Return requests are created with "pending" status awaiting approval
 * - FR35: System tracks who approved/rejected returns and when
 * - FR36: Only approved returns affect royalty calculations
 */

import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sales } from "./sales";
import { tenants } from "./tenants";
import { titles } from "./titles";
import { users } from "./users";

/**
 * Return status values - approval workflow states
 * - pending: Default status for new returns awaiting approval
 * - approved: Return approved by Finance role, affects royalty calculations
 * - rejected: Return rejected, excluded from all financial calculations
 */
export const returnStatusValues = ["pending", "approved", "rejected"] as const;

export type ReturnStatus = (typeof returnStatusValues)[number];

/**
 * Returns table - Return requests with approval workflow
 *
 * Tracks return requests from creation through approval/rejection.
 * Only approved returns affect royalty calculations (FR36).
 *
 * Primary use cases:
 * - Recording return requests (entry by editors)
 * - Approval workflow (Finance role approves/rejects)
 * - Royalty calculations (only approved returns deduct from royalties)
 * - Returns reporting and analytics
 * - Financial audit trail
 */
export const returns = pgTable(
  "returns",
  {
    /** Unique identifier for the return (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /**
     * Foreign key to titles table - the title being returned
     * ON DELETE RESTRICT - cannot delete a title with returns records
     */
    title_id: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "restrict" }),

    /**
     * Foreign key to sales table - optional reference to original sale
     * ON DELETE SET NULL - can delete sale, reference becomes null
     * Nullable: returns can be recorded without tracking specific sale
     */
    original_sale_id: uuid("original_sale_id").references(() => sales.id, {
      onDelete: "set null",
    }),

    /**
     * Format of the returned item
     * Valid values: physical, ebook, audiobook
     * Matches sales format values for consistency
     */
    format: text("format").notNull(),

    /**
     * Quantity returned (must be positive integer)
     * CHECK constraint enforces quantity > 0
     * Note: Quantity is POSITIVE - the fact it's a return determines deduction
     */
    quantity: integer("quantity").notNull(),

    /**
     * Unit price per item (DECIMAL(10,2) for currency precision)
     * CHECK constraint enforces unit_price > 0
     * Use Decimal.js for any calculations - never JavaScript arithmetic
     */
    unit_price: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),

    /**
     * Total return amount (DECIMAL(10,2) for currency precision)
     * Should equal quantity * unit_price
     * CHECK constraint enforces total_amount > 0
     * Computed at application layer using Decimal.js
     */
    total_amount: numeric("total_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),

    /**
     * Date of the return (required)
     * Used for royalty period calculations and reporting
     */
    return_date: date("return_date").notNull(),

    /** Optional reason for the return */
    reason: text("reason"),

    /**
     * Approval status
     * Default: pending (awaiting Finance approval)
     * Valid values: pending, approved, rejected
     */
    status: text("status").notNull().default("pending"),

    /**
     * Foreign key to users table - who approved/rejected this return
     * ON DELETE SET NULL - if reviewer user deleted, reference becomes null
     * Nullable: only set after review
     */
    reviewed_by_user_id: uuid("reviewed_by_user_id").references(
      () => users.id,
      {
        onDelete: "set null",
      },
    ),

    /** When the return was reviewed (approved/rejected) */
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),

    /**
     * Internal note added during approval (optional)
     * Story 3.6 AC 6: "Stores internal note if provided"
     * Used for audit trail and internal communication
     */
    internal_note: text("internal_note"),

    /**
     * Foreign key to users table - who created this return record
     * ON DELETE RESTRICT - cannot delete a user who created returns records
     * Used for audit trail
     */
    created_by_user_id: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Last update timestamp (UTC, auto-updated) */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Index on tenant_id for RLS filtering and foreign key join performance */
    tenantIdIdx: index("returns_tenant_id_idx").on(table.tenant_id),

    /** Index on title_id for title lookups and joins */
    titleIdIdx: index("returns_title_id_idx").on(table.title_id),

    /** Index on status for approval queue filtering (critical for pending returns) */
    statusIdx: index("returns_status_idx").on(table.status),

    /** Index on return_date for date range queries and royalty period filtering */
    returnDateIdx: index("returns_return_date_idx").on(table.return_date),

    /** Composite index for common queries: tenant + date range */
    tenantReturnDateIdx: index("returns_tenant_return_date_idx").on(
      table.tenant_id,
      table.return_date,
    ),

    /** Composite index for approval queue queries: tenant + status */
    tenantStatusIdx: index("returns_tenant_status_idx").on(
      table.tenant_id,
      table.status,
    ),

    /** CHECK constraint: quantity must be positive */
    quantityPositive: check("returns_quantity_positive", sql`quantity > 0`),

    /** CHECK constraint: unit_price must be positive */
    unitPricePositive: check(
      "returns_unit_price_positive",
      sql`unit_price > 0`,
    ),

    /** CHECK constraint: total_amount must be positive */
    totalAmountPositive: check(
      "returns_total_amount_positive",
      sql`total_amount > 0`,
    ),
  }),
);

/**
 * TypeScript type for SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type Return = typeof returns.$inferSelect;

/**
 * TypeScript type for INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertReturn = typeof returns.$inferInsert;
