# Story 15.4: Build Webhook Subscription System

Status: done

## Story

**As a** developer,
**I want** to receive webhook notifications,
**So that** I can react to events in real-time.

## Context

Epic 15 (REST API & Webhooks) enables third-party integrations. Stories 15.1-15.3 established OAuth2 authentication, REST endpoints, and rate limiting. This story implements the webhook subscription management system that allows tenants to register endpoints for event notifications.

### Dependencies
- **Story 15.1** (COMPLETE): OAuth2 authentication with API keys
- **Story 15.2** (COMPLETE): Core REST API endpoints
- **Story 15.3** (COMPLETE): Rate limiting with Token Bucket algorithm

### What This Story Delivers
- Database schema for `webhook_subscriptions` table
- API endpoints for CRUD operations on webhook subscriptions
- UI in Settings for webhook management
- Webhook secret generation for HMAC verification
- Test delivery functionality

### What Story 15.5 Will Add
- Actual event delivery via Inngest queue
- HMAC-SHA256 signature generation
- Delivery retry with exponential backoff
- `webhook_deliveries` table for audit log

## Acceptance Criteria

### AC1: Create Webhook Subscription
- **Given** I am a tenant administrator
- **When** I create a webhook subscription
- **Then** I specify endpoint URL (HTTPS required for live, HTTP allowed for test)
- **And** I provide a friendly name for the subscription
- **And** system validates URL format and reachability

### AC2: Select Event Types
- **Given** I am creating/editing a webhook subscription
- **When** I select event types to subscribe to
- **Then** available events include:
  - `title.created` - New title added
  - `title.updated` - Title metadata changed
  - `sale.created` - New sale recorded
  - `statement.generated` - Royalty statement created
  - `onix.exported` - ONIX feed generated

### AC3: Webhook Secret Generation
- **Given** I create a webhook subscription
- **When** the subscription is saved
- **Then** system generates a unique webhook secret (32-byte random hex)
- **And** secret is displayed once to user (cannot be retrieved later)
- **And** secret is stored hashed in database (bcrypt)
- **And** user can regenerate secret (invalidates previous)

### AC4: Enable/Disable Subscriptions
- **Given** I have an active webhook subscription
- **When** I disable it
- **Then** no events are queued for this subscription
- **And** I can re-enable it at any time
- **And** status is clearly visible in the UI

### AC5: Test Webhook Delivery
- **Given** I have a webhook subscription
- **When** I click "Test" / "Send Test Event"
- **Then** system sends a test payload to the endpoint
- **And** I see success/failure result immediately
- **And** test events have `"test": true` in payload

### AC6: Multiple Subscriptions Per Tenant
- **Given** I am a tenant administrator
- **When** I create webhook subscriptions
- **Then** I can have multiple subscriptions (up to 10 per tenant)
- **And** each can subscribe to different event types
- **And** each has its own endpoint URL and secret

### AC7: View/Edit/Delete Subscriptions
- **Given** I have webhook subscriptions
- **When** I view the webhooks settings page
- **Then** I see list of all subscriptions with:
  - Name, URL (masked), events subscribed, status
  - Created date, last successful delivery (future)
- **And** I can edit name, URL, events
- **And** I can delete subscriptions (with confirmation)

## Tasks

- [ ] **Task 1**: Create webhook subscriptions database schema + migration
- [ ] **Task 2**: Create webhook subscription service (`src/modules/api/webhooks/subscription-service.ts`)
- [ ] **Task 3**: Create webhook REST API endpoints
- [ ] **Task 4**: Build webhook settings UI page
- [ ] **Task 5**: Implement test delivery functionality
- [ ] **Task 6**: Write tests

## Dev Notes

### Task 1: Database Schema

Create `src/db/schema/webhook-subscriptions.ts`:

```typescript
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
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
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
    lastDeliveryAt: timestamp("last_delivery_at", { mode: "date", withTimezone: true }),
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
    activeIdx: index("webhook_subscriptions_active_idx").on(table.tenantId, table.isActive),
  }),
);

// Type exports
export type WebhookSubscription = InferSelectModel<typeof webhookSubscriptions>;
export type InsertWebhookSubscription = InferInsertModel<typeof webhookSubscriptions>;

// Max subscriptions per tenant
export const MAX_SUBSCRIPTIONS_PER_TENANT = 10;

// UI-friendly event type definitions (for form components)
export const WEBHOOK_EVENT_TYPE_OPTIONS = [
  { value: "title.created", label: "Title Created", description: "New title added" },
  { value: "title.updated", label: "Title Updated", description: "Title metadata changed" },
  { value: "sale.created", label: "Sale Created", description: "New sale recorded" },
  { value: "statement.generated", label: "Statement Generated", description: "Royalty statement created" },
  { value: "onix.exported", label: "ONIX Exported", description: "ONIX feed generated" },
] as const;
```

**IMPORTANT:** The `WEBHOOK_EVENT_TYPES` array and `WEBHOOK_EVENT_TYPE_OPTIONS` must stay in sync. If you add new event types, update both.

**Update `src/db/schema/index.ts`:**
```typescript
export * from "./webhook-subscriptions";
```

**Update `src/db/schema/relations.ts`:**
```typescript
import { webhookSubscriptions } from "./webhook-subscriptions";

export const webhookSubscriptionsRelations = relations(webhookSubscriptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [webhookSubscriptions.tenantId],
    references: [tenants.id],
  }),
}));
```

**Generate migration:**
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

### Task 2: Webhook Subscription Service

Create `src/modules/api/webhooks/subscription-service.ts`:

```typescript
/**
 * Webhook Subscription Service
 *
 * Story 15.4 - FR147: Webhook subscription management
 */

import { eq, and, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/db";
import {
  webhookSubscriptions,
  type WebhookSubscription,
  type InsertWebhookSubscription,
  type WebhookEventType,
  WEBHOOK_EVENT_TYPES,
  MAX_SUBSCRIPTIONS_PER_TENANT,
} from "@/db/schema/webhook-subscriptions";

const BCRYPT_ROUNDS = 10;
const SECRET_BYTES = 32; // 256 bits

export interface CreateSubscriptionInput {
  tenantId: string;
  name: string;
  description?: string;
  url: string;
  events: WebhookEventType[];
  createdBy: string;
}

export interface UpdateSubscriptionInput {
  name?: string;
  description?: string;
  url?: string;
  events?: WebhookEventType[];
  isActive?: boolean;
}

export interface CreateSubscriptionResult {
  subscription: WebhookSubscription;
  secret: string; // Plain text secret - shown only once
}

/**
 * Generate a cryptographically secure webhook secret
 */
function generateSecret(): string {
  return crypto.randomBytes(SECRET_BYTES).toString("hex");
}

/**
 * Validate webhook URL
 * - HTTPS required for production
 * - HTTP allowed for localhost/test environments only
 */
export function validateWebhookUrl(url: string, isTest = false): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Must be http or https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "URL must use HTTP or HTTPS protocol" };
    }

    // HTTPS required for non-localhost in production
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    if (!isTest && !isLocalhost && parsed.protocol !== "https:") {
      return { valid: false, error: "HTTPS required for webhook endpoints (HTTP only allowed for localhost)" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Validate event types
 */
export function validateEventTypes(events: string[]): { valid: boolean; invalid: string[] } {
  const invalid = events.filter((e) => !WEBHOOK_EVENT_TYPES.includes(e as WebhookEventType));
  return { valid: invalid.length === 0, invalid };
}

/**
 * Create a new webhook subscription
 */
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<CreateSubscriptionResult> {
  // Check subscription limit
  const [existing] = await db
    .select({ count: count() })
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.tenantId, input.tenantId));

  if (existing.count >= MAX_SUBSCRIPTIONS_PER_TENANT) {
    throw new Error(`Maximum of ${MAX_SUBSCRIPTIONS_PER_TENANT} webhook subscriptions per tenant`);
  }

  // Validate URL
  const urlValidation = validateWebhookUrl(input.url);
  if (!urlValidation.valid) {
    throw new Error(urlValidation.error);
  }

  // Validate events
  const eventValidation = validateEventTypes(input.events);
  if (!eventValidation.valid) {
    throw new Error(`Invalid event types: ${eventValidation.invalid.join(", ")}`);
  }

  // Generate and hash secret
  const secret = generateSecret();
  const secretHash = await bcrypt.hash(secret, BCRYPT_ROUNDS);

  // Insert subscription
  const [subscription] = await db
    .insert(webhookSubscriptions)
    .values({
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      url: input.url,
      secretHash,
      events: input.events,
      createdBy: input.createdBy,
    })
    .returning();

  return { subscription, secret };
}

/**
 * Get subscription by ID (with tenant check)
 */
export async function getSubscription(
  id: string,
  tenantId: string
): Promise<WebhookSubscription | null> {
  const subscription = await db.query.webhookSubscriptions.findFirst({
    where: and(
      eq(webhookSubscriptions.id, id),
      eq(webhookSubscriptions.tenantId, tenantId)
    ),
  });
  return subscription ?? null;
}

/**
 * List subscriptions for a tenant
 */
export async function listSubscriptions(tenantId: string): Promise<WebhookSubscription[]> {
  return db.query.webhookSubscriptions.findMany({
    where: eq(webhookSubscriptions.tenantId, tenantId),
    orderBy: (subscriptions, { desc }) => [desc(subscriptions.createdAt)],
  });
}

/**
 * Update a webhook subscription
 */
export async function updateSubscription(
  id: string,
  tenantId: string,
  updates: UpdateSubscriptionInput
): Promise<WebhookSubscription | null> {
  // Validate URL if being updated
  if (updates.url) {
    const urlValidation = validateWebhookUrl(updates.url);
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error);
    }
  }

  // Validate events if being updated
  if (updates.events) {
    const eventValidation = validateEventTypes(updates.events);
    if (!eventValidation.valid) {
      throw new Error(`Invalid event types: ${eventValidation.invalid.join(", ")}`);
    }
  }

  const [updated] = await db
    .update(webhookSubscriptions)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(webhookSubscriptions.id, id),
        eq(webhookSubscriptions.tenantId, tenantId)
      )
    )
    .returning();

  return updated ?? null;
}

/**
 * Regenerate webhook secret
 * Returns new plaintext secret (shown only once)
 */
export async function regenerateSecret(
  id: string,
  tenantId: string
): Promise<{ secret: string } | null> {
  const secret = generateSecret();
  const secretHash = await bcrypt.hash(secret, BCRYPT_ROUNDS);

  const [updated] = await db
    .update(webhookSubscriptions)
    .set({
      secretHash,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(webhookSubscriptions.id, id),
        eq(webhookSubscriptions.tenantId, tenantId)
      )
    )
    .returning();

  if (!updated) return null;
  return { secret };
}

/**
 * Delete a webhook subscription
 */
export async function deleteSubscription(
  id: string,
  tenantId: string
): Promise<boolean> {
  const result = await db
    .delete(webhookSubscriptions)
    .where(
      and(
        eq(webhookSubscriptions.id, id),
        eq(webhookSubscriptions.tenantId, tenantId)
      )
    )
    .returning({ id: webhookSubscriptions.id });

  return result.length > 0;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * NOTE: For test events, we use a temporary signing key so developers can verify their implementation
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Test webhook delivery
 * Sends a test event to the endpoint with signature headers
 * so developers can verify their signature validation works
 */
export async function testWebhook(
  id: string,
  tenantId: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const subscription = await getSubscription(id, tenantId);
  if (!subscription) {
    return { success: false, error: "Subscription not found" };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const testPayload = {
    id: crypto.randomUUID(),
    type: "test",
    test: true,
    created_at: new Date().toISOString(),
    data: {
      message: "This is a test webhook from Salina ERP",
      subscription_id: subscription.id,
      subscription_name: subscription.name,
    },
  };

  const body = JSON.stringify(testPayload);

  // For test events, generate signature using a test key
  // Real events (Story 15.5) will use the actual stored secret
  const testSigningKey = "test_" + subscription.id;
  const signaturePayload = `${timestamp}.${body}`;
  const signature = signPayload(signaturePayload, testSigningKey);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(subscription.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Salina-Webhook/1.0",
        "X-Webhook-Test": "true",
        "X-Webhook-Timestamp": timestamp.toString(),
        "X-Webhook-Signature": `sha256=${signature}`,
        // Include test signing key so developer can verify signature
        "X-Webhook-Test-Key": testSigningKey,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      success: response.ok,
      statusCode: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message.includes("abort") ? "Request timed out (10s)" : message,
    };
  }
}
```

---

### Task 3: REST API Endpoints

Create `src/app/api/v1/webhooks/route.ts`:

```typescript
/**
 * Webhook Subscriptions API
 *
 * Story 15.4 - FR147: Webhook subscription management
 *
 * GET /api/v1/webhooks - List subscriptions
 * POST /api/v1/webhooks - Create subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest, requireScope } from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import { apiSuccess, validationError, apiError } from "@/modules/api/utils/response";
import {
  createSubscription,
  listSubscriptions,
  validateEventTypes,
  validateWebhookUrl,
  WEBHOOK_EVENT_TYPES,
} from "@/modules/api/webhooks/subscription-service";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  try {
    const subscriptions = await listSubscriptions(authResult.context.tenantId);

    // Mask URLs for security (show only domain)
    const masked = subscriptions.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      url_domain: new URL(s.url).hostname,
      events: s.events,
      is_active: s.isActive,
      last_delivery_at: s.lastDeliveryAt,
      last_delivery_status: s.lastDeliveryStatus,
      consecutive_failures: s.consecutiveFailures,
      created_at: s.createdAt,
    }));

    return addRateLimitHeaders(apiSuccess({ subscriptions: masked }), rateLimit.state);
  } catch (error) {
    console.error("[API] List webhooks error:", error);
    return addRateLimitHeaders(
      apiError("server_error", "Failed to list webhooks", 500),
      rateLimit.state
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  try {
    const body = await request.json();
    const validation = createSchema.safeParse(body);

    if (!validation.success) {
      return addRateLimitHeaders(
        validationError(
          Object.fromEntries(validation.error.errors.map((e) => [e.path.join("."), e.message]))
        ),
        rateLimit.state
      );
    }

    const { name, description, url, events } = validation.data;

    // Validate URL
    const urlValidation = validateWebhookUrl(url, authResult.context.isTest);
    if (!urlValidation.valid) {
      return addRateLimitHeaders(
        validationError({ url: urlValidation.error! }),
        rateLimit.state
      );
    }

    // Validate events
    const eventValidation = validateEventTypes(events);
    if (!eventValidation.valid) {
      return addRateLimitHeaders(
        validationError({
          events: `Invalid event types: ${eventValidation.invalid.join(", ")}. Valid types: ${WEBHOOK_EVENT_TYPES.join(", ")}`,
        }),
        rateLimit.state
      );
    }

    const result = await createSubscription({
      tenantId: authResult.context.tenantId,
      name,
      description,
      url,
      events: events as any,
      createdBy: authResult.context.userId,
    });

    // Return with secret (shown only once!)
    const response = apiSuccess(
      {
        subscription: {
          id: result.subscription.id,
          name: result.subscription.name,
          url_domain: new URL(result.subscription.url).hostname,
          events: result.subscription.events,
          is_active: result.subscription.isActive,
          created_at: result.subscription.createdAt,
        },
        secret: result.secret, // IMPORTANT: Display this to user - cannot be retrieved again
        warning: "Store this secret securely. It cannot be retrieved again.",
      },
      201
    );

    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create webhook";
    console.error("[API] Create webhook error:", error);
    return addRateLimitHeaders(apiError("server_error", message, 500), rateLimit.state);
  }
}
```

Create `src/app/api/v1/webhooks/[id]/route.ts`:

```typescript
/**
 * Webhook Subscription Detail API
 *
 * GET /api/v1/webhooks/:id - Get subscription
 * PUT /api/v1/webhooks/:id - Update subscription
 * DELETE /api/v1/webhooks/:id - Delete subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest, requireScope } from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import { apiSuccess, notFound, validationError, apiError } from "@/modules/api/utils/response";
import {
  getSubscription,
  updateSubscription,
  deleteSubscription,
  validateEventTypes,
  validateWebhookUrl,
} from "@/modules/api/webhooks/subscription-service";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { id } = await params;
  const subscription = await getSubscription(id, authResult.context.tenantId);

  if (!subscription) {
    return addRateLimitHeaders(notFound("Webhook subscription"), rateLimit.state);
  }

  return addRateLimitHeaders(
    apiSuccess({
      id: subscription.id,
      name: subscription.name,
      description: subscription.description,
      url: subscription.url, // Full URL for owner
      events: subscription.events,
      is_active: subscription.isActive,
      last_delivery_at: subscription.lastDeliveryAt,
      last_delivery_status: subscription.lastDeliveryStatus,
      consecutive_failures: subscription.consecutiveFailures,
      created_at: subscription.createdAt,
      updated_at: subscription.updatedAt,
    }),
    rateLimit.state
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { id } = await params;

  try {
    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return addRateLimitHeaders(
        validationError(
          Object.fromEntries(validation.error.errors.map((e) => [e.path.join("."), e.message]))
        ),
        rateLimit.state
      );
    }

    const { name, description, url, events, is_active } = validation.data;

    // Validate URL if provided
    if (url) {
      const urlValidation = validateWebhookUrl(url, authResult.context.isTest);
      if (!urlValidation.valid) {
        return addRateLimitHeaders(
          validationError({ url: urlValidation.error! }),
          rateLimit.state
        );
      }
    }

    // Validate events if provided
    if (events) {
      const eventValidation = validateEventTypes(events);
      if (!eventValidation.valid) {
        return addRateLimitHeaders(
          validationError({
            events: `Invalid event types: ${eventValidation.invalid.join(", ")}`,
          }),
          rateLimit.state
        );
      }
    }

    const updated = await updateSubscription(id, authResult.context.tenantId, {
      name,
      description,
      url,
      events: events as any,
      isActive: is_active,
    });

    if (!updated) {
      return addRateLimitHeaders(notFound("Webhook subscription"), rateLimit.state);
    }

    return addRateLimitHeaders(
      apiSuccess({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        url: updated.url,
        events: updated.events,
        is_active: updated.isActive,
        updated_at: updated.updatedAt,
      }),
      rateLimit.state
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update webhook";
    console.error("[API] Update webhook error:", error);
    return addRateLimitHeaders(apiError("server_error", message, 500), rateLimit.state);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { id } = await params;
  const deleted = await deleteSubscription(id, authResult.context.tenantId);

  if (!deleted) {
    return addRateLimitHeaders(notFound("Webhook subscription"), rateLimit.state);
  }

  return addRateLimitHeaders(apiSuccess({ deleted: true }), rateLimit.state);
}
```

Create `src/app/api/v1/webhooks/[id]/test/route.ts`:

```typescript
/**
 * Webhook Test Delivery API
 *
 * POST /api/v1/webhooks/:id/test - Send test event
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, requireScope } from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import { apiSuccess, notFound, apiError } from "@/modules/api/utils/response";
import { testWebhook } from "@/modules/api/webhooks/subscription-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { id } = await params;
  const result = await testWebhook(id, authResult.context.tenantId);

  if (result.error === "Subscription not found") {
    return addRateLimitHeaders(notFound("Webhook subscription"), rateLimit.state);
  }

  return addRateLimitHeaders(
    apiSuccess({
      success: result.success,
      status_code: result.statusCode,
      error: result.error,
    }),
    rateLimit.state
  );
}
```

Create `src/app/api/v1/webhooks/[id]/secret/route.ts`:

```typescript
/**
 * Webhook Secret Regeneration API
 *
 * POST /api/v1/webhooks/:id/secret - Regenerate secret
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, requireScope } from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import { apiSuccess, notFound, apiError } from "@/modules/api/utils/response";
import { regenerateSecret } from "@/modules/api/webhooks/subscription-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { id } = await params;
  const result = await regenerateSecret(id, authResult.context.tenantId);

  if (!result) {
    return addRateLimitHeaders(notFound("Webhook subscription"), rateLimit.state);
  }

  return addRateLimitHeaders(
    apiSuccess({
      secret: result.secret,
      warning: "Store this secret securely. It cannot be retrieved again. Previous secret is now invalid.",
    }),
    rateLimit.state
  );
}
```

---

### Task 4: Settings UI

Create `src/app/(dashboard)/settings/webhooks/page.tsx`:

```typescript
/**
 * Webhook Settings Page
 *
 * Story 15.4 - FR147: Webhook subscription management UI
 */

import { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { WebhookList } from "@/modules/api/webhooks/components/webhook-list";

export const metadata: Metadata = {
  title: "Webhooks | Settings",
  description: "Manage webhook subscriptions for event notifications",
};

export default async function WebhooksPage() {
  await requireAuth({ requiredRole: ["admin", "owner"] });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Webhooks</h2>
        <p className="text-muted-foreground">
          Configure webhook endpoints to receive real-time event notifications.
        </p>
      </div>
      <WebhookList />
    </div>
  );
}
```

Create `src/modules/api/webhooks/components/webhook-list.tsx`:

```typescript
"use client";

/**
 * Webhook List Component
 *
 * Story 15.4 - Webhook subscription management UI
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, RefreshCw, TestTube, Trash2, Edit, Key } from "lucide-react";
import { toast } from "sonner";
import { WebhookCreateDialog } from "./webhook-create-dialog";
import { WebhookEditDialog } from "./webhook-edit-dialog";
import { WebhookSecretDialog } from "./webhook-secret-dialog";
import {
  listWebhooks,
  deleteWebhook,
  testWebhook,
  regenerateWebhookSecret,
  type WebhookSubscription,
} from "../actions";

export function WebhookList() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookSubscription | null>(null);
  const [newSecret, setNewSecret] = useState<{ id: string; secret: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => listWebhooks(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: testWebhook,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Test delivered successfully (HTTP ${result.status_code})`);
      } else {
        toast.error(`Test failed: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateWebhookSecret,
    onSuccess: (result, webhookId) => {
      setNewSecret({ id: webhookId, secret: result.secret });
      toast.success("Secret regenerated - copy it now!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const webhooks = data?.webhooks ?? [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Webhook Subscriptions</CardTitle>
            <CardDescription>
              Endpoints that receive event notifications from Salina
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load webhooks
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No webhook subscriptions configured.
              <br />
              <Button variant="link" onClick={() => setCreateOpen(true)}>
                Create your first webhook
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {webhook.url_domain}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event: string) => (
                          <Badge key={event} variant="secondary" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                        {webhook.events.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{webhook.events.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={webhook.is_active ? "default" : "secondary"}>
                        {webhook.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => testMutation.mutate(webhook.id)}
                            disabled={testMutation.isPending}
                          >
                            <TestTube className="mr-2 h-4 w-4" />
                            Test Delivery
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingWebhook(webhook)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => regenerateMutation.mutate(webhook.id)}
                            disabled={regenerateMutation.isPending}
                          >
                            <Key className="mr-2 h-4 w-4" />
                            Regenerate Secret
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("Delete this webhook subscription?")) {
                                deleteMutation.mutate(webhook.id);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <WebhookCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editingWebhook && (
        <WebhookEditDialog
          webhook={editingWebhook}
          open={!!editingWebhook}
          onOpenChange={(open) => !open && setEditingWebhook(null)}
        />
      )}

      {newSecret && (
        <WebhookSecretDialog
          secret={newSecret.secret}
          open={!!newSecret}
          onOpenChange={(open) => !open && setNewSecret(null)}
        />
      )}
    </>
  );
}
```

Create `src/modules/api/webhooks/components/webhook-create-dialog.tsx`:

```typescript
"use client";

/**
 * Webhook Create Dialog
 * Story 15.4 - Create new webhook subscription
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { createWebhook } from "../actions";
import { WebhookSecretDialog } from "./webhook-secret-dialog";
import { WEBHOOK_EVENT_TYPE_OPTIONS } from "@/db/schema/webhook-subscriptions";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.string()).min(1, "Select at least one event type"),
});

type FormValues = z.infer<typeof formSchema>;

interface WebhookCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebhookCreateDialog({ open, onOpenChange }: WebhookCreateDialogProps) {
  const queryClient = useQueryClient();
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      url: "",
      events: [],
    },
  });

  const mutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setNewSecret(result.secret);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open && !newSecret} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Configure an endpoint to receive event notifications.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Webhook" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/webhook" {...field} />
                    </FormControl>
                    <FormDescription>
                      HTTPS required (HTTP allowed for localhost only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What this webhook is used for..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="events"
                render={() => (
                  <FormItem>
                    <FormLabel>Event Types</FormLabel>
                    <FormDescription>Select events to subscribe to</FormDescription>
                    <div className="space-y-2 mt-2">
                      {WEBHOOK_EVENT_TYPE_OPTIONS.map((event) => (
                        <FormField
                          key={event.value}
                          control={form.control}
                          name="events"
                          render={({ field }) => (
                            <FormItem className="flex items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(event.value)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, event.value]);
                                    } else {
                                      field.onChange(current.filter((v) => v !== event.value));
                                    }
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-0.5">
                                <Label className="font-medium">{event.label}</Label>
                                <p className="text-xs text-muted-foreground">{event.description}</p>
                              </div>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Creating..." : "Create Webhook"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {newSecret && (
        <WebhookSecretDialog
          secret={newSecret}
          open={!!newSecret}
          onOpenChange={(open) => {
            if (!open) {
              setNewSecret(null);
              onOpenChange(false);
            }
          }}
          isNew
        />
      )}
    </>
  );
}
```

Create `src/modules/api/webhooks/components/webhook-edit-dialog.tsx`:

```typescript
"use client";

/**
 * Webhook Edit Dialog
 * Story 15.4 - Edit existing webhook subscription
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { updateWebhook, type WebhookSubscription } from "../actions";
import { WEBHOOK_EVENT_TYPE_OPTIONS } from "@/db/schema/webhook-subscriptions";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.string()).min(1, "Select at least one event type"),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface WebhookEditDialogProps {
  webhook: WebhookSubscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebhookEditDialog({ webhook, open, onOpenChange }: WebhookEditDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: webhook.name,
      description: webhook.description || "",
      url: "", // URL not shown for security, must re-enter to change
      events: webhook.events,
      is_active: webhook.is_active,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      // Only send URL if it was changed (non-empty)
      const data = {
        name: values.name,
        description: values.description,
        events: values.events,
        is_active: values.is_active,
        ...(values.url ? { url: values.url } : {}),
      };
      return updateWebhook(webhook.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook updated");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Webhook</DialogTitle>
          <DialogDescription>
            Update webhook configuration. Current endpoint: {webhook.url_domain}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>Enable or disable this webhook</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint URL (leave blank to keep current)</FormLabel>
                  <FormControl>
                    <Input placeholder={`Current: ${webhook.url_domain}`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="events"
              render={() => (
                <FormItem>
                  <FormLabel>Event Types</FormLabel>
                  <div className="space-y-2 mt-2">
                    {WEBHOOK_EVENT_TYPE_OPTIONS.map((event) => (
                      <FormField
                        key={event.value}
                        control={form.control}
                        name="events"
                        render={({ field }) => (
                          <FormItem className="flex items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(event.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, event.value]);
                                  } else {
                                    field.onChange(current.filter((v) => v !== event.value));
                                  }
                                }}
                              />
                            </FormControl>
                            <div className="space-y-0.5">
                              <Label className="font-medium">{event.label}</Label>
                              <p className="text-xs text-muted-foreground">{event.description}</p>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

Create `src/modules/api/webhooks/components/webhook-secret-dialog.tsx`:

```typescript
"use client";

/**
 * Webhook Secret Dialog
 * Story 15.4 - Display webhook secret (one-time view)
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface WebhookSecretDialogProps {
  secret: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNew?: boolean;
}

export function WebhookSecretDialog({
  secret,
  open,
  onOpenChange,
  isNew = false,
}: WebhookSecretDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Webhook Created Successfully" : "New Webhook Secret"}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? "Your webhook has been created. Copy the secret below."
              : "Your webhook secret has been regenerated."}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important - Copy Now!</AlertTitle>
          <AlertDescription>
            This secret will only be shown once. Store it securely - you cannot retrieve it later.
            {!isNew && " The previous secret is now invalid."}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook Secret</label>
          <div className="flex gap-2">
            <Input
              value={secret}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use this secret to verify webhook signatures with HMAC-SHA256.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            I&apos;ve Copied the Secret
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 5: Server Actions

Create `src/modules/api/webhooks/actions.ts`:

```typescript
"use server";

/**
 * Webhook Server Actions
 *
 * Story 15.4 - Server actions for webhook management
 *
 * Security: All create/delete/secret-regenerate operations are audit logged
 */

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import * as service from "./subscription-service";

// Audit log helper for webhook security events
async function logWebhookEvent(
  tenantId: string,
  userId: string,
  action: string,
  resourceId: string,
  details?: Record<string, unknown>
) {
  await db.insert(auditLogs).values({
    tenantId,
    userId,
    action,
    resourceType: "webhook_subscription",
    resourceId,
    details: details ? JSON.stringify(details) : null,
  });
}

export interface WebhookSubscription {
  id: string;
  name: string;
  description?: string | null;
  url_domain: string;
  events: string[];
  is_active: boolean;
  last_delivery_at?: Date | null;
  last_delivery_status?: string | null;
  consecutive_failures: number;
  created_at: Date;
}

export async function listWebhooks(): Promise<{ webhooks: WebhookSubscription[] }> {
  const { user } = await requireAuth({ requiredRole: ["admin", "owner"] });
  const subscriptions = await service.listSubscriptions(user.tenant_id);

  return {
    webhooks: subscriptions.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      url_domain: new URL(s.url).hostname,
      events: s.events as string[],
      is_active: s.isActive,
      last_delivery_at: s.lastDeliveryAt,
      last_delivery_status: s.lastDeliveryStatus,
      consecutive_failures: s.consecutiveFailures,
      created_at: s.createdAt,
    })),
  };
}

export async function createWebhook(data: {
  name: string;
  description?: string;
  url: string;
  events: string[];
}): Promise<{ id: string; secret: string }> {
  const { user } = await requireAuth({ requiredRole: ["admin", "owner"] });

  const result = await service.createSubscription({
    tenantId: user.tenant_id,
    name: data.name,
    description: data.description,
    url: data.url,
    events: data.events as any,
    createdBy: user.id,
  });

  // Audit log: webhook created (security event)
  await logWebhookEvent(user.tenant_id, user.id, "webhook.created", result.subscription.id, {
    name: data.name,
    url_domain: new URL(data.url).hostname,
    events: data.events,
  });

  revalidatePath("/settings/webhooks");

  return {
    id: result.subscription.id,
    secret: result.secret,
  };
}

export async function updateWebhook(
  id: string,
  data: {
    name?: string;
    description?: string;
    url?: string;
    events?: string[];
    is_active?: boolean;
  }
): Promise<void> {
  const { user } = await requireAuth({ requiredRole: ["admin", "owner"] });

  await service.updateSubscription(id, user.tenant_id, {
    name: data.name,
    description: data.description,
    url: data.url,
    events: data.events as any,
    isActive: data.is_active,
  });

  revalidatePath("/settings/webhooks");
}

export async function deleteWebhook(id: string): Promise<void> {
  const { user } = await requireAuth({ requiredRole: ["admin", "owner"] });

  // Get subscription name before deletion for audit log
  const subscription = await service.getSubscription(id, user.tenant_id);

  await service.deleteSubscription(id, user.tenant_id);

  // Audit log: webhook deleted (security event)
  if (subscription) {
    await logWebhookEvent(user.tenant_id, user.id, "webhook.deleted", id, {
      name: subscription.name,
    });
  }

  revalidatePath("/settings/webhooks");
}

export async function testWebhook(id: string): Promise<{
  success: boolean;
  status_code?: number;
  error?: string;
}> {
  const { user } = await requireAuth({ requiredRole: ["admin", "owner"] });
  return service.testWebhook(id, user.tenant_id);
}

export async function regenerateWebhookSecret(id: string): Promise<{ secret: string }> {
  const { user } = await requireAuth({ requiredRole: ["admin", "owner"] });

  // Get subscription for audit log
  const subscription = await service.getSubscription(id, user.tenant_id);

  const result = await service.regenerateSecret(id, user.tenant_id);

  if (!result) {
    throw new Error("Webhook not found");
  }

  // Audit log: secret regenerated (security event - important for compliance)
  await logWebhookEvent(user.tenant_id, user.id, "webhook.secret_regenerated", id, {
    name: subscription?.name,
  });

  return result;
}
```

---

### Task 6: Tests

**Unit tests (`tests/unit/webhook-subscription.test.ts`):**
- URL validation: HTTPS required for non-localhost
- URL validation: HTTP allowed for localhost
- Event type validation
- Secret generation produces 64-char hex
- Subscription limit enforced (max 10)
- Tenant isolation on get/update/delete

**Integration tests (`tests/integration/api-webhooks.test.ts`):**
- POST /api/v1/webhooks creates subscription with secret
- GET /api/v1/webhooks lists subscriptions (masked URLs)
- GET /api/v1/webhooks/:id returns full details
- PUT /api/v1/webhooks/:id updates subscription
- DELETE /api/v1/webhooks/:id removes subscription
- POST /api/v1/webhooks/:id/test sends test event
- POST /api/v1/webhooks/:id/secret regenerates secret
- Rate limits applied to all endpoints
- Admin scope required for write operations
- Tenant isolation prevents cross-tenant access

---

### Update Settings Navigation

**Update `src/app/(dashboard)/settings/layout.tsx`:**

Add webhooks to the `settingsNav` array. **CRITICAL:** Use exact format matching existing entries:

```typescript
const settingsNav = [
  { href: "/settings", label: "General", exact: true },
  { href: "/settings/users", label: "Users", exact: false },
  { href: "/settings/api-keys", label: "API Keys", exact: false },
  { href: "/settings/isbn-import", label: "ISBN Import", exact: false },
  { href: "/settings/isbn-prefixes", label: "ISBN Prefixes", exact: false },
  { href: "/settings/integrations", label: "Integrations", exact: false },
  { href: "/settings/webhooks", label: "Webhooks", exact: false }, // ADD THIS LINE
];
```

---

### Project Structure Notes

**New files:**
- `src/db/schema/webhook-subscriptions.ts`
- `src/modules/api/webhooks/subscription-service.ts`
- `src/modules/api/webhooks/actions.ts`
- `src/modules/api/webhooks/components/webhook-list.tsx`
- `src/modules/api/webhooks/components/webhook-create-dialog.tsx`
- `src/modules/api/webhooks/components/webhook-edit-dialog.tsx`
- `src/modules/api/webhooks/components/webhook-secret-dialog.tsx`
- `src/app/(dashboard)/settings/webhooks/page.tsx`
- `src/app/api/v1/webhooks/route.ts`
- `src/app/api/v1/webhooks/[id]/route.ts`
- `src/app/api/v1/webhooks/[id]/test/route.ts`
- `src/app/api/v1/webhooks/[id]/secret/route.ts`
- `tests/unit/webhook-subscription.test.ts`
- `tests/integration/api-webhooks.test.ts`
- `drizzle/migrations/XXXX_webhook_subscriptions.sql`

**Modified files:**
- `src/db/schema/index.ts` - Export webhook-subscriptions
- `src/db/schema/relations.ts` - Add webhookSubscriptionsRelations
- `src/app/(dashboard)/settings/layout.tsx` - Add webhooks nav link

---

### References

- [docs/architecture.md - Pattern 6: Webhook Delivery]
- [docs/architecture.md - ADR-010: Webhook Delivery]
- [docs/epics.md - Story 15.4, FR147]
- [src/db/schema/api-keys.ts - Secret hashing pattern]
- [src/modules/api/middleware/auth-middleware.ts - API authentication]
- [src/modules/api/middleware/rate-limiter.ts - Rate limiting integration]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
