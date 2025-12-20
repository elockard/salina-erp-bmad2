/**
 * Webhook Subscriptions Schema
 *
 * Story 15.4 - FR147: Webhook subscription registration
 *
 * Security:
 * - Secret is bcrypt hashed (never stored plaintext)
 * - URL validated for HTTPS (live) or HTTP (test only)
 * - RLS enforces tenant isolation
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

// Supported webhook event types
export const WEBHOOK_EVENT_TYPES = [
  "title.created",
  "title.updated",
  "sale.created",
  "statement.generated",
  "onix.exported",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // Subscription identification
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Endpoint configuration
    url: text("url").notNull(), // Target endpoint URL
    secretHash: text("secret_hash").notNull(), // bcrypt hash of webhook secret

    // Event subscriptions - stored as text array
    events: text("events").array().notNull().default([]),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Delivery stats (updated by Story 15.5)
    lastDeliveryAt: timestamp("last_delivery_at", {
      mode: "date",
      withTimezone: true,
    }),
    lastDeliveryStatus: varchar("last_delivery_status", { length: 20 }), // 'success' | 'failed'
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),

    // Lifecycle
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdx: index("webhook_subscriptions_tenant_idx").on(table.tenantId),
    activeIdx: index("webhook_subscriptions_active_idx").on(
      table.tenantId,
      table.isActive,
    ),
  }),
);

// Type exports
export type WebhookSubscription = InferSelectModel<typeof webhookSubscriptions>;
export type InsertWebhookSubscription = InferInsertModel<
  typeof webhookSubscriptions
>;

// Max subscriptions per tenant
export const MAX_SUBSCRIPTIONS_PER_TENANT = 10;

// UI-friendly event type definitions (for form components)
// IMPORTANT: WEBHOOK_EVENT_TYPES and WEBHOOK_EVENT_TYPE_OPTIONS must stay in sync
export const WEBHOOK_EVENT_TYPE_OPTIONS = [
  {
    value: "title.created",
    label: "Title Created",
    description: "New title added",
  },
  {
    value: "title.updated",
    label: "Title Updated",
    description: "Title metadata changed",
  },
  {
    value: "sale.created",
    label: "Sale Created",
    description: "New sale recorded",
  },
  {
    value: "statement.generated",
    label: "Statement Generated",
    description: "Royalty statement created",
  },
  {
    value: "onix.exported",
    label: "ONIX Exported",
    description: "ONIX feed generated",
  },
] as const;
