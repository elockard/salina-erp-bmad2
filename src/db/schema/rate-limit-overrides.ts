/**
 * Rate Limit Overrides Schema
 *
 * Story 15.3 - AC5: Configurable Per-Tenant Limits
 *
 * Allows platform admins to set custom rate limits per tenant.
 * If no override exists, defaults from RATE_LIMITS are used.
 */

import { index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const rateLimitOverrides = pgTable(
  "rate_limit_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" })
      .unique(),

    // Minute window limits
    requestsPerMinute: integer("requests_per_minute").notNull().default(100),

    // Hour window limits
    requestsPerHour: integer("requests_per_hour").notNull().default(1000),

    // Audit
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: uuid("updated_by"), // Platform admin user ID
  },
  (table) => [index("rate_limit_overrides_tenant_idx").on(table.tenantId)],
);

export type RateLimitOverride = typeof rateLimitOverrides.$inferSelect;
export type InsertRateLimitOverride = typeof rateLimitOverrides.$inferInsert;
