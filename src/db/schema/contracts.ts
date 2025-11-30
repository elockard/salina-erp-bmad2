/**
 * Contracts Schema
 *
 * Database schema for royalty contracts with tiered rate support in the Salina ERP system.
 * Contracts link authors to titles with advance tracking and tiered royalty rates.
 * Contracts are managed at the tenant level with multi-tenant isolation via RLS.
 *
 * Related FRs: FR38-FR44 (Royalty Contract Management)
 * Epic: Epic 4 - Royalty Contracts
 * Story: 4.1 - Create Royalty Contract Database Schema with Tiered Rates
 *
 * Architecture References:
 * - architecture.md lines 1700-1744 (Contracts and Contract Tiers schema)
 * - prd.md FR38-FR44 (Royalty contract requirements)
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary (see migration SQL)
 * - Note: contract_tiers are implicitly tenant-scoped via contract relationship
 *
 * Tiered Royalty Rate Model:
 * - FR39: Configure tiered rates by format and sales volume
 * - FR40: Support multiple tiers per format
 * - Rates stored as DECIMAL(5,4) where 0.1000 = 10%
 * - Use Decimal.js for all royalty calculations
 *
 * Foreign Key Strategy:
 * - tenants → CASCADE delete (tenant deletion removes all tenant data)
 * - authors → RESTRICT delete (cannot delete author with active contracts)
 * - titles → RESTRICT delete (cannot delete title with active contracts)
 * - contracts → CASCADE delete on tiers (contract deletion removes all tiers)
 */

import { sql } from "drizzle-orm";
import {
  check,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authors } from "./authors";
import { tenants } from "./tenants";
import { titles } from "./titles";

/**
 * Contract status values
 * - active: Contract is currently in effect
 * - terminated: Contract has been ended
 * - suspended: Contract is temporarily paused
 */
export const contractStatusValues = [
  "active",
  "terminated",
  "suspended",
] as const;

export type ContractStatus = (typeof contractStatusValues)[number];

/**
 * Contract format values for tiered rates
 * - physical: Physical book format
 * - ebook: Digital ebook format
 * - audiobook: Audio format
 */
export const contractFormatValues = ["physical", "ebook", "audiobook"] as const;

export type ContractFormat = (typeof contractFormatValues)[number];

/**
 * Contracts table - Royalty contracts linking authors to titles
 *
 * Each contract represents a royalty agreement between a publisher (tenant)
 * and an author for a specific title. Tracks advance payments and their
 * recoupment status.
 *
 * Business Rules:
 * - One contract per author-title combination per tenant (unique constraint)
 * - Advance amounts tracked: total advance, amount paid, amount recouped
 * - All currency fields use DECIMAL(10,2) for precision
 * - Use Decimal.js for any financial calculations
 *
 * Primary use cases:
 * - Recording royalty contract terms
 * - Tracking advance payments and recoupment
 * - Linking to tiered royalty rate structures
 * - Contract status management (active/terminated/suspended)
 */
export const contracts = pgTable(
  "contracts",
  {
    /** Unique identifier for the contract (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /**
     * Foreign key to authors table - the author party to this contract
     * ON DELETE RESTRICT - cannot delete an author with contracts
     */
    author_id: uuid("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "restrict" }),

    /**
     * Foreign key to titles table - the title covered by this contract
     * ON DELETE RESTRICT - cannot delete a title with contracts
     */
    title_id: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "restrict" }),

    /**
     * Total advance amount agreed in the contract (DECIMAL(10,2))
     * CHECK constraint enforces >= 0
     * Default: 0 (no advance)
     */
    advance_amount: decimal("advance_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),

    /**
     * Amount of advance already paid to author (DECIMAL(10,2))
     * CHECK constraint enforces >= 0
     * Should not exceed advance_amount (enforced at application layer)
     * Default: 0
     */
    advance_paid: decimal("advance_paid", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),

    /**
     * Amount of advance recouped from royalty earnings (DECIMAL(10,2))
     * CHECK constraint enforces >= 0
     * Should not exceed advance_paid (enforced at application layer)
     * Default: 0
     */
    advance_recouped: decimal("advance_recouped", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),

    /**
     * Contract status
     * Default: active
     * Valid values: active, terminated, suspended
     */
    status: text("status").notNull().default("active"),

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
    tenantIdIdx: index("contracts_tenant_id_idx").on(table.tenant_id),

    /** Index on author_id for author lookups */
    authorIdIdx: index("contracts_author_id_idx").on(table.author_id),

    /** Index on title_id for title lookups */
    titleIdIdx: index("contracts_title_id_idx").on(table.title_id),

    /** Index on status for filtering by contract status */
    statusIdx: index("contracts_status_idx").on(table.status),

    /** Composite index for common queries: tenant + author */
    tenantAuthorIdx: index("contracts_tenant_id_author_id_idx").on(
      table.tenant_id,
      table.author_id,
    ),

    /**
     * Unique constraint: one contract per author-title per tenant
     * Enforces business rule that each author can have only one
     * contract per title within a tenant
     */
    tenantAuthorTitleUnique: unique("contracts_tenant_author_title_unique").on(
      table.tenant_id,
      table.author_id,
      table.title_id,
    ),

    /** CHECK constraint: advance_amount must be non-negative */
    advanceAmountNonnegative: check(
      "contracts_advance_amount_nonnegative",
      sql`advance_amount >= 0`,
    ),

    /** CHECK constraint: advance_paid must be non-negative */
    advancePaidNonnegative: check(
      "contracts_advance_paid_nonnegative",
      sql`advance_paid >= 0`,
    ),

    /** CHECK constraint: advance_recouped must be non-negative */
    advanceRecoupedNonnegative: check(
      "contracts_advance_recouped_nonnegative",
      sql`advance_recouped >= 0`,
    ),
  }),
);

/**
 * Contract Tiers table - Tiered royalty rate structure
 *
 * Each tier defines a royalty rate for a specific format and quantity range.
 * Multiple tiers per format allow for volume-based rate increases.
 *
 * Example tier structure for physical books:
 * - 0-5000 units: 10% (0.1000)
 * - 5001-10000 units: 12% (0.1200)
 * - 10001+: 15% (0.1500, max_quantity = null)
 *
 * Business Rules:
 * - Rates stored as DECIMAL(5,4) where 0.1000 = 10%
 * - min_quantity is required (>= 0)
 * - max_quantity is nullable (null = unlimited/infinity)
 * - max_quantity must be > min_quantity when not null
 * - Rate must be between 0 and 1 (0-100%)
 *
 * Primary use cases:
 * - Defining tiered royalty rate structures
 * - Supporting different rates by format
 * - Volume-based royalty calculations
 */
export const contractTiers = pgTable(
  "contract_tiers",
  {
    /** Unique identifier for the tier (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /**
     * Foreign key to contracts table
     * ON DELETE CASCADE - deleting a contract removes all its tiers
     */
    contract_id: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),

    /**
     * Format this tier applies to
     * Valid values: physical, ebook, audiobook
     */
    format: text("format").notNull(),

    /**
     * Minimum quantity for this tier (inclusive)
     * CHECK constraint enforces >= 0
     */
    min_quantity: integer("min_quantity").notNull(),

    /**
     * Maximum quantity for this tier (inclusive)
     * Nullable: null means "infinity" or no upper limit
     * CHECK constraint enforces > min_quantity when not null
     */
    max_quantity: integer("max_quantity"),

    /**
     * Royalty rate for this tier (DECIMAL(5,4))
     * Stored as decimal: 0.1000 = 10%, 0.1500 = 15%
     * CHECK constraint enforces 0 <= rate <= 1
     */
    rate: decimal("rate", { precision: 5, scale: 4 }).notNull(),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Index on contract_id for join performance */
    contractIdIdx: index("contract_tiers_contract_id_idx").on(table.contract_id),

    /** CHECK constraint: min_quantity must be non-negative */
    minQuantityNonnegative: check(
      "contract_tiers_min_quantity_nonnegative",
      sql`min_quantity >= 0`,
    ),

    /** CHECK constraint: max_quantity must be > min_quantity when not null */
    maxQuantityValid: check(
      "contract_tiers_max_quantity_valid",
      sql`max_quantity IS NULL OR max_quantity > min_quantity`,
    ),

    /** CHECK constraint: rate must be between 0 and 1 (0-100%) */
    rateValid: check(
      "contract_tiers_rate_valid",
      sql`rate >= 0 AND rate <= 1`,
    ),
  }),
);

/**
 * TypeScript type for contracts SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type Contract = typeof contracts.$inferSelect;

/**
 * TypeScript type for contracts INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertContract = typeof contracts.$inferInsert;

/**
 * TypeScript type for contract_tiers SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type ContractTier = typeof contractTiers.$inferSelect;

/**
 * TypeScript type for contract_tiers INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertContractTier = typeof contractTiers.$inferInsert;
