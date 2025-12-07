import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// Royalty period type values for enum
export const royaltyPeriodTypeValues = [
  "calendar_year",
  "fiscal_year",
  "custom",
] as const;

export type RoyaltyPeriodType = (typeof royaltyPeriodTypeValues)[number];

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  subdomain: text("subdomain").notNull().unique(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  fiscal_year_start: date("fiscal_year_start"),
  default_currency: text("default_currency").notNull().default("USD"),
  statement_frequency: text("statement_frequency")
    .notNull()
    .default("quarterly"),
  // Royalty period settings (Story 7.5)
  royalty_period_type: text("royalty_period_type")
    .notNull()
    .default("fiscal_year"),
  royalty_period_start_month: integer("royalty_period_start_month"),
  royalty_period_start_day: integer("royalty_period_start_day"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Type exports
export type Tenant = InferSelectModel<typeof tenants>;
export type InsertTenant = InferInsertModel<typeof tenants>;
