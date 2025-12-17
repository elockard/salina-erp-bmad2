/**
 * Sales Schema
 *
 * Database schema for sales transaction management in the Salina ERP system.
 * Sales are recorded at the tenant level with multi-tenant isolation via RLS.
 * Implements an APPEND-ONLY ledger - no UPDATE or DELETE operations allowed.
 *
 * Related FRs: FR24-FR29 (Sales Transaction Management)
 * Epic: Epic 3 - Sales & Returns Processing
 * Story: 3.1 - Create Sales Transaction Database Schema
 *
 * Architecture References:
 * - architecture.md lines 1636-1669 (Sales table specification)
 * - prd.md FR24-FR29 (Sales requirements)
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary (see migration SQL)
 *
 * APPEND-ONLY LEDGER (CRITICAL):
 * - Sales records are IMMUTABLE once created
 * - No UPDATE or DELETE operations should be implemented
 * - FR29: System prevents modification of historical transactions
 * - updated_at field exists for metadata but record content is immutable
 * - Future enhancement: Database trigger to enforce immutability at DB level
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
import { tenants } from "./tenants";
import { titles } from "./titles";
import { users } from "./users";

/**
 * Sales channel values - distribution channels for sales
 * - retail: Direct retail sales (bookstores, etc.)
 * - wholesale: Bulk sales to distributors/retailers
 * - direct: Direct-to-consumer sales (publisher website, etc.)
 * - distributor: Sales through distribution partners (e.g., Ingram)
 * - amazon: Sales through Amazon marketplace (Story 17.3)
 */
export const salesChannelValues = [
  "retail",
  "wholesale",
  "direct",
  "distributor",
  "amazon",
] as const;

export type SalesChannel = (typeof salesChannelValues)[number];

/**
 * Sales format values - format of the sold item
 * - physical: Physical book (print edition)
 * - ebook: Electronic book (digital edition)
 * - audiobook: Audio recording of the book
 */
export const salesFormatValues = ["physical", "ebook", "audiobook"] as const;

export type SalesFormat = (typeof salesFormatValues)[number];

/**
 * Sales table - Immutable ledger of sales transactions
 *
 * APPEND-ONLY: This table implements an immutable audit ledger.
 * Do NOT implement update or delete operations for this table.
 *
 * Primary use cases:
 * - Recording sales transactions (real-time entry by editors)
 * - Royalty calculations (basis for author earnings)
 * - Sales reporting and analytics
 * - Financial audit trail
 */
export const sales = pgTable(
  "sales",
  {
    /** Unique identifier for the sale (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /**
     * Foreign key to titles table - the title that was sold
     * ON DELETE RESTRICT - cannot delete a title with sales records
     */
    title_id: uuid("title_id")
      .notNull()
      .references(() => titles.id),

    /**
     * Format of the sold item
     * Enforced via text enum at database level
     * Valid values: physical, ebook, audiobook
     */
    format: text("format", { enum: salesFormatValues }).notNull(),

    /**
     * Quantity sold (must be positive integer)
     * CHECK constraint enforces quantity > 0
     */
    quantity: integer("quantity").notNull(),

    /**
     * Unit price per item (DECIMAL(10,2) for currency precision)
     * CHECK constraint enforces unit_price > 0
     * Use Decimal.js for any calculations - never JavaScript arithmetic
     */
    unit_price: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),

    /**
     * Total sale amount (DECIMAL(10,2) for currency precision)
     * Should equal quantity * unit_price
     * CHECK constraint enforces total_amount > 0
     * Computed at application layer using Decimal.js
     */
    total_amount: numeric("total_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),

    /**
     * Date of the sale (required)
     * Used for royalty period calculations and reporting
     */
    sale_date: date("sale_date").notNull(),

    /**
     * Sales channel
     * Enforced via text enum at database level
     * Valid values: retail, wholesale, direct, distributor, amazon
     */
    channel: text("channel", { enum: salesChannelValues }).notNull(),

    /**
     * Foreign key to users table - who entered this sale record
     * ON DELETE RESTRICT - cannot delete a user who created sales records
     * Used for audit trail
     */
    created_by_user_id: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * Last update timestamp (UTC, auto-updated)
     * Note: For metadata only - sale record content is IMMUTABLE
     */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Index on tenant_id for RLS filtering and foreign key join performance */
    tenantIdIdx: index("sales_tenant_id_idx").on(table.tenant_id),

    /** Index on title_id for title lookups and joins */
    titleIdIdx: index("sales_title_id_idx").on(table.title_id),

    /** Index on sale_date for date range queries and royalty period filtering */
    saleDateIdx: index("sales_sale_date_idx").on(table.sale_date),

    /** Index on channel for channel-based filtering and reporting */
    channelIdx: index("sales_channel_idx").on(table.channel),

    /** Index on format for format-based filtering and reporting */
    formatIdx: index("sales_format_idx").on(table.format),

    /** Composite index for common queries: tenant + date range */
    tenantSaleDateIdx: index("sales_tenant_sale_date_idx").on(
      table.tenant_id,
      table.sale_date,
    ),

    /** CHECK constraint: quantity must be positive */
    quantityPositive: check("sales_quantity_positive", sql`quantity > 0`),

    /** CHECK constraint: unit_price must be positive */
    unitPricePositive: check("sales_unit_price_positive", sql`unit_price > 0`),

    /** CHECK constraint: total_amount must be positive */
    totalAmountPositive: check(
      "sales_total_amount_positive",
      sql`total_amount > 0`,
    ),
  }),
);

/**
 * TypeScript type for SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type Sale = typeof sales.$inferSelect;

/**
 * TypeScript type for INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertSale = typeof sales.$inferInsert;
