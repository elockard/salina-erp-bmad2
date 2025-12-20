/**
 * API Keys Schema
 *
 * Story 15.1 - FR143: OAuth2 API Authentication
 *
 * Security:
 * - Secret is bcrypt hashed (never stored plaintext)
 * - RLS enforces tenant isolation
 * - Soft delete via revoked_at (keys cannot be reactivated)
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // Key identification
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    keyId: varchar("key_id", { length: 50 }).notNull().unique(), // sk_live_xxxx or sk_test_xxxx

    // Security - NEVER store plaintext secret
    secretHash: text("secret_hash").notNull(), // bcrypt hash

    // Permissions
    scopes: text("scopes").array().notNull().default([]), // ['read', 'write', 'admin']

    // Usage tracking
    lastUsedAt: timestamp("last_used_at", { mode: "date", withTimezone: true }),
    lastUsedIp: varchar("last_used_ip", { length: 45 }), // IPv6 max length

    // Lifecycle
    isTest: boolean("is_test").notNull().default(false), // sk_test_ vs sk_live_
    revokedAt: timestamp("revoked_at", { mode: "date", withTimezone: true }),
    revokedBy: uuid("revoked_by"),

    // Audit
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by").notNull(),
  },
  (table) => ({
    tenantIdx: index("api_keys_tenant_idx").on(table.tenantId),
    keyIdIdx: index("api_keys_key_id_idx").on(table.keyId),
    activeKeysIdx: index("api_keys_active_idx").on(
      table.tenantId,
      table.revokedAt,
    ),
  }),
);

// Type exports
export type ApiKey = InferSelectModel<typeof apiKeys>;
export type InsertApiKey = InferInsertModel<typeof apiKeys>;

// Scope constants
export const API_SCOPES = {
  READ: "read",
  WRITE: "write",
  ADMIN: "admin",
} as const;

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES];

// Valid scope combinations
export const SCOPE_HIERARCHY: Record<ApiScope, ApiScope[]> = {
  read: ["read"],
  write: ["read", "write"],
  admin: ["read", "write", "admin"],
};
