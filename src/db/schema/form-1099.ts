/**
 * Form 1099 Schema
 *
 * Database schema for tracking generated 1099-MISC forms.
 *
 * Story: 11.3 - Generate 1099-MISC Forms
 * AC-11.3.8: 1099 Generation Tracking
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter (MUST be FIRST)
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 *
 * Business Rules:
 * - Unique constraint: (tenant_id, contact_id, tax_year)
 * - One 1099 per author per year per tenant
 * - PDF stored in S3: 1099/{tenant_id}/{form_1099_id}.pdf
 *
 * @see src/db/schema/contacts.ts for author contact information
 */

import {
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * form_1099 table - Tracks generated 1099-MISC forms for IRS compliance
 *
 * Primary use cases:
 * - Track which authors have received 1099 forms for each tax year
 * - Store PDF S3 key for download/regeneration
 * - Audit trail: who generated the form and when
 * - Prevent duplicate 1099s via unique constraint
 *
 * CRITICAL Security Rules:
 * - ALL queries MUST have tenant_id as FIRST filter condition
 * - Never expose form data across tenant boundaries
 */
export const form1099 = pgTable(
  "form_1099",
  {
    /** Unique identifier for the form (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Foreign key to contacts table - the author receiving the 1099 */
    contact_id: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),

    /** Tax year for this 1099 (e.g., 2024) */
    tax_year: integer("tax_year").notNull(),

    /** Total amount reported on Box 7 (Nonemployee Compensation) */
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),

    /** S3 key for the generated PDF (e.g., "1099/tenant-id/form-id.pdf") */
    pdf_s3_key: text("pdf_s3_key"),

    /** Timestamp when the 1099 was generated */
    generated_at: timestamp("generated_at", { withTimezone: true }).notNull(),

    /** User who generated this 1099 form */
    generated_by_user_id: uuid("generated_by_user_id")
      .notNull()
      .references(() => users.id),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Last update timestamp (UTC, auto-generated) */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** Index on tenant_id for foreign key join performance */
    tenantIdIdx: index("form_1099_tenant_id_idx").on(table.tenant_id),

    /** Composite index for efficient tenant-scoped year queries */
    tenantYearIdx: index("form_1099_tenant_year_idx").on(
      table.tenant_id,
      table.tax_year,
    ),

    /** Index on contact_id for join performance */
    contactIdIdx: index("form_1099_contact_id_idx").on(table.contact_id),

    /**
     * Unique constraint: One 1099 per author per year per tenant
     * Prevents duplicate form generation
     */
    uniqueForm: unique("form_1099_tenant_contact_year_unique").on(
      table.tenant_id,
      table.contact_id,
      table.tax_year,
    ),
  }),
);

/**
 * TypeScript type for form_1099 SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type Form1099 = typeof form1099.$inferSelect;

/**
 * TypeScript type for form_1099 INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertForm1099 = typeof form1099.$inferInsert;
