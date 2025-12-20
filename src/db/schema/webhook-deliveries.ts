/**
 * Webhook Deliveries Schema
 *
 * Story 15.5 - FR148/FR149: Webhook delivery with signatures and audit trail
 *
 * Tracks all webhook delivery attempts for debugging, retry, and compliance.
 * APPEND-ONLY: Delivery records are immutable for audit trail integrity.
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { webhookSubscriptions } from "./webhook-subscriptions";

// Delivery status enum
export const DELIVERY_STATUS = ["pending", "delivered", "failed"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUS)[number];

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => webhookSubscriptions.id, { onDelete: "cascade" }),

    // Event details
    eventId: uuid("event_id").notNull(), // Unique event ID for idempotency
    eventType: varchar("event_type", { length: 50 }).notNull(),

    // Delivery status
    status: varchar("status", { length: 20 })
      .notNull()
      .default("pending")
      .$type<DeliveryStatus>(),

    // HTTP response details
    responseStatusCode: integer("response_status_code"),
    responseBody: text("response_body"), // First 1000 chars of response
    errorMessage: text("error_message"),

    // Retry tracking
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),

    // Timing
    durationMs: integer("duration_ms"),
    deliveredAt: timestamp("delivered_at", {
      mode: "date",
      withTimezone: true,
    }),

    // Payload snapshot (for debugging and redelivery)
    payload: text("payload").notNull(), // JSON stringified

    // Lifecycle
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    subscriptionIdx: index("webhook_deliveries_subscription_idx").on(
      table.subscriptionId,
    ),
    tenantIdx: index("webhook_deliveries_tenant_idx").on(table.tenantId),
    statusIdx: index("webhook_deliveries_status_idx").on(
      table.subscriptionId,
      table.status,
    ),
    createdIdx: index("webhook_deliveries_created_idx").on(
      table.subscriptionId,
      table.createdAt,
    ),
  }),
);

// Type exports
export type WebhookDelivery = InferSelectModel<typeof webhookDeliveries>;
export type InsertWebhookDelivery = InferInsertModel<typeof webhookDeliveries>;
