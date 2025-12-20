# Story 15.2: Build Core REST API Endpoints

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** developer,
**I want** to access titles, contacts, and sales via API,
**So that** I can sync data with external systems.

## Context

Epic 15 (REST API & Webhooks) enables third-party integrations through a public REST API. Story 15.1 established the OAuth2 authentication foundation. This story builds the core CRUD endpoints that developers will use to programmatically access and manage Salina data.

### Dependencies
- **Story 15.1** (COMPLETE): OAuth2 authentication with API keys and JWT tokens
- No external dependencies - builds on existing modules

### Business Value
- Enables third-party system integrations (inventory, accounting, CRM)
- Allows publishers to automate data sync workflows
- Foundation for Stories 15.4-15.6 (webhooks, documentation)
- Powers programmatic ONIX export for channel automation

### Existing Infrastructure to Reference
From Story 15.1:
- `src/modules/api/middleware/auth-middleware.ts` - `authenticateApiRequest`, `requireScope`, `ApiContext`
- `src/modules/api/auth/token-service.ts` - JWT validation
- `src/app/api/v1/auth/token/route.ts` - Token endpoint pattern

From existing modules:
- `src/modules/titles/queries.ts` - `getTitles`, `getTitleById`, `TitleFilters`
- `src/modules/contacts/queries.ts` - Contact query patterns
- `src/modules/sales/queries.ts` - Sales query patterns
- `src/modules/onix/builder/` - ONIX message generation

## Acceptance Criteria

### AC1: Titles API - GET /api/v1/titles
- **Given** I have a valid API token with `read` scope
- **When** I call `GET /api/v1/titles`
- **Then** I receive a paginated list of titles for my tenant
- **And** response includes:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "title": "Book Title",
        "isbn": "9781234567890",
        "format": "paperback",
        "publication_status": "published",
        "list_price": 19.99,
        "publication_date": "2024-01-15",
        "authors": [
          {"contactId": "uuid", "name": "Author Name", "isPrimary": true}
        ],
        "created_at": "ISO-8601",
        "updated_at": "ISO-8601"
      }
    ],
    "pagination": {
      "cursor": "encoded-cursor",
      "has_more": true,
      "total_count": 150
    }
  }
  ```
- **And** I can filter by query parameters: `?status=published&search=keyword&author_id=uuid`
- **And** I can paginate with `?cursor=xxx&limit=50` (default 20, max 100)

### AC2: Titles API - GET /api/v1/titles/:id
- **Given** I have a valid API token with `read` scope
- **When** I call `GET /api/v1/titles/:id`
- **Then** I receive the full title details including all metadata
- **And** response returns 404 if title not found or belongs to different tenant

### AC3: Titles API - POST /api/v1/titles
- **Given** I have a valid API token with `write` scope
- **When** I POST to `/api/v1/titles` with title data
- **Then** a new title is created in my tenant
- **And** response includes the created title with `id`
- **And** validation errors return 400 with field-level error messages

### AC4: Titles API - PUT /api/v1/titles/:id
- **Given** I have a valid API token with `write` scope
- **When** I PUT to `/api/v1/titles/:id` with updated data
- **Then** the title is updated (partial updates supported)
- **And** response includes the updated title
- **And** returns 404 if title not found

### AC5: Contacts API - GET/POST/PUT /api/v1/contacts
- **Given** I have a valid API token
- **When** I call contacts endpoints
- **Then** I can:
  - GET list with filtering by `?role=author&search=name`
  - GET single contact by ID with roles array
  - POST to create new contact (write scope)
  - PUT to update contact (write scope)
- **And** response includes `roles` array from contact_roles table
- **And** the following sensitive fields are EXCLUDED from API responses:
  - `tax_id`, `tin_encrypted`, `tin_type`, `tin_last_four`
  - `payment_info`
  - `w9_received`, `w9_received_date`

### AC6: Sales API - GET/POST /api/v1/sales
- **Given** I have a valid API token
- **When** I call sales endpoints
- **Then** I can:
  - GET list with filtering by `?title_id=uuid&start_date=2024-01-01&end_date=2024-12-31&channel=amazon&format=ebook`
  - GET single sale by ID
  - POST to create new sale transaction (write scope)
- **And** sales cannot be updated via API (immutable audit trail)
- **And** bulk POST supported with array of transactions (max 100)
- **And** API-created sales use tenant's system user for `created_by_user_id` audit field

### AC7: ONIX Export API - GET /api/v1/onix/export
- **Given** I have a valid API token with `read` scope
- **When** I call `GET /api/v1/onix/export`
- **Then** I receive ONIX 3.1 XML for all my titles (or filtered subset)
- **And** I can filter by `?title_ids=uuid1,uuid2&version=3.1|3.0&since=ISO-8601`
- **And** response Content-Type is `application/xml`
- **And** ONIX version controlled via constructor (3.1 default, 3.0 for legacy channels)
- **And** titles with `list_price` include price in ONIX ProductSupply block
- **And** for large catalogs (>500 titles), consider streaming or pagination

### AC8: Tenant Isolation
- **Given** API requests from different tenants
- **When** accessing any endpoint
- **Then** data is strictly isolated to the authenticated tenant
- **And** attempting to access another tenant's resource returns 404 (not 403)

### AC9: Error Response Format
- **Given** an API error occurs
- **When** responding to the client
- **Then** use consistent error format:
  ```json
  {
    "error": {
      "code": "validation_error|not_found|unauthorized|forbidden|rate_limited|server_error",
      "message": "Human-readable description",
      "details": {"field": "error reason"} // for validation errors
    }
  }
  ```
- **And** HTTP status codes: 400 (validation), 401 (auth), 403 (scope), 404 (not found), 429 (rate limit), 500 (server)

### AC10: Rate Limit Headers
- **Given** any API response
- **When** returning to client
- **Then** include headers:
  - `X-RateLimit-Limit`: requests allowed per window
  - `X-RateLimit-Remaining`: requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when window resets
- **And** default limits: 100 requests/minute (actual enforcement in Story 15.3)

## Tasks / Subtasks

- [x] Task 1 (AC: 8, 9, 10): Create shared API utilities and response helpers
  - [x] Create `src/modules/api/utils/response.ts` with success/error response builders
  - [x] Create `src/modules/api/utils/pagination.ts` with cursor-based pagination helpers
  - [x] Create `src/modules/api/utils/rate-limit-headers.ts` for header injection
  - [x] Add Zod schemas for common API types

- [x] Task 2 (AC: 1, 2, 3, 4): Implement Titles API endpoints
  - [x] Create `src/app/api/v1/titles/route.ts` (GET list, POST create)
  - [x] Create `src/app/api/v1/titles/[id]/route.ts` (GET single, PUT update)
  - [x] Add Zod validation schemas for title create/update
  - [x] Implement cursor-based pagination for list endpoint
  - [x] Add filtering support (status, search, author_id)

- [x] Task 3 (AC: 5): Implement Contacts API endpoints
  - [x] Create `src/app/api/v1/contacts/route.ts` (GET list, POST create)
  - [x] Create `src/app/api/v1/contacts/[id]/route.ts` (GET single, PUT update)
  - [x] Exclude sensitive fields (tax_id, etc.) from API responses
  - [x] Add filtering support (type, search)

- [x] Task 4 (AC: 6): Implement Sales API endpoints
  - [x] Create `src/app/api/v1/sales/route.ts` (GET list, POST create/bulk)
  - [x] Create `src/app/api/v1/sales/[id]/route.ts` (GET single only)
  - [x] Implement bulk create with validation (max 100)
  - [x] Add filtering support (title_id, date range, source)

- [x] Task 5 (AC: 7): Implement ONIX Export API endpoint
  - [x] Create `src/app/api/v1/onix/export/route.ts`
  - [x] Integrate with existing ONIX builder from `src/modules/onix/`
  - [x] Support filtering by title_ids, since date
  - [x] Support format parameter (3.1 default, 3.0 fallback)
  - [x] Support channel-specific formatting

- [x] Task 6 (AC: 1-10): Write comprehensive tests
  - [x] Unit tests for response helpers and pagination
  - [x] Integration tests for each endpoint with auth validation
  - [x] Test tenant isolation (cross-tenant access prevention)
  - [x] Test error scenarios and response format

## Dev Notes

### CRITICAL: Authentication Pattern

Every API route MUST follow this pattern:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, requireScope, type ApiContext } from "@/modules/api/middleware/auth-middleware";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Authenticate
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) {
    return authResult.error;
  }
  const ctx: ApiContext = authResult.context;

  // 2. Check scope (read for GET, write for POST/PUT)
  const scopeError = requireScope(ctx, "read");
  if (scopeError) return scopeError;

  // 3. Use ctx.tenantId for all database queries
  // NEVER trust user-provided tenant ID
}
```

### CRITICAL: Cursor-Based Pagination

Do NOT use offset-based pagination (performance issues with large datasets). Use cursor-based:

```typescript
interface PaginationParams {
  cursor?: string;  // Base64-encoded {id, updated_at}
  limit: number;    // Default 20, max 100
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor: string | null;  // null if no more results
    has_more: boolean;
    total_count: number;
  };
}

// Cursor implementation
function encodeCursor(id: string, timestamp: Date): string {
  return Buffer.from(JSON.stringify({ id, ts: timestamp.toISOString() })).toString("base64");
}

function decodeCursor(cursor: string): { id: string; ts: Date } | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString());
    return { id: decoded.id, ts: new Date(decoded.ts) };
  } catch {
    return null;
  }
}
```

### Task 1: Response Utilities

Create `src/modules/api/utils/response.ts`:

```typescript
import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "validation_error"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "server_error";

interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, string>;
  };
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, string>
): NextResponse {
  const body: ApiError = {
    error: { code, message, ...(details && { details }) },
  };
  return NextResponse.json(body, { status });
}

export function notFound(resource: string): NextResponse {
  return apiError("not_found", `${resource} not found`, 404);
}

export function validationError(details: Record<string, string>): NextResponse {
  return apiError("validation_error", "Validation failed", 400, details);
}

// Rate limit header injection
export function withRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  reset: number
): NextResponse {
  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", reset.toString());
  return response;
}
```

### Task 2: Titles API Structure

Create `src/app/api/v1/titles/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, gt, ilike, lt, or, sql } from "drizzle-orm";
import { adminDb } from "@/db";
import { titles } from "@/db/schema/titles";
import { titleAuthors } from "@/db/schema/title-authors";
import { authenticateApiRequest, requireScope } from "@/modules/api/middleware/auth-middleware";
import { apiSuccess, validationError, notFound, apiError } from "@/modules/api/utils/response";
import { decodeCursor, encodeCursor } from "@/modules/api/utils/pagination";

// Validation schema for query params
const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["draft", "pending", "published", "out_of_print"]).optional(),
  search: z.string().optional(),
  author_id: z.string().uuid().optional(),
});

// Validation schema for create - matches src/db/schema/titles.ts
const createTitleSchema = z.object({
  // Required
  title: z.string().min(1).max(500),

  // Basic metadata
  subtitle: z.string().max(500).optional(),
  genre: z.string().max(100).optional(),
  word_count: z.number().int().positive().optional(),

  // Identifiers
  isbn: z.string().regex(/^97[89]\d{10}$/).optional(),
  asin: z.string().regex(/^[A-Z0-9]{10}$/).optional(), // Story 17.4

  // Publishing info
  publication_status: z.enum(["draft", "pending", "published", "out_of_print"]).default("draft"),
  publication_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD

  // Contact/Author reference
  contact_id: z.string().uuid().optional(),

  // Accessibility (Story 14.3)
  epub_accessibility_conformance: z.string().optional(),
  accessibility_features: z.array(z.string()).optional(),
  accessibility_hazards: z.array(z.string()).optional(),
  accessibility_summary: z.string().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return scopeError;

  const { searchParams } = new URL(request.url);
  const queryResult = listQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!queryResult.success) {
    return validationError(
      Object.fromEntries(
        queryResult.error.errors.map(e => [e.path.join("."), e.message])
      )
    );
  }

  const { cursor, limit, status, search, author_id } = queryResult.data;
  const tenantId = authResult.context.tenantId;

  // Build query conditions
  const conditions = [eq(titles.tenant_id, tenantId)];

  if (status) conditions.push(eq(titles.publication_status, status));
  if (search) {
    conditions.push(
      or(ilike(titles.title, `%${search}%`), ilike(titles.isbn, `%${search}%`)) ?? eq(titles.id, titles.id)
    );
  }

  // Handle cursor for pagination
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      conditions.push(
        or(
          lt(titles.updated_at, decoded.ts),
          and(eq(titles.updated_at, decoded.ts), gt(titles.id, decoded.id))
        ) ?? eq(titles.id, titles.id)
      );
    }
  }

  // Fetch titles with authors
  const result = await adminDb.query.titles.findMany({
    where: and(...conditions),
    with: {
      titleAuthors: {
        with: { contact: true },
        orderBy: [desc(titleAuthors.is_primary)],
      },
    },
    orderBy: [desc(titles.updated_at)],
    limit: limit + 1, // Fetch one extra to check has_more
  });

  // Author filter post-query (if needed)
  let filtered = result;
  if (author_id) {
    filtered = result.filter(t =>
      t.titleAuthors?.some(ta => ta.contact_id === author_id)
    );
  }

  const hasMore = filtered.length > limit;
  const data = filtered.slice(0, limit);
  const lastItem = data[data.length - 1];

  // Transform response
  const transformed = data.map(t => ({
    id: t.id,
    title: t.title,
    isbn: t.isbn,
    format: t.format,
    publication_status: t.publication_status,
    list_price: t.list_price,
    publication_date: t.publication_date,
    authors: t.titleAuthors?.map(ta => ({
      contactId: ta.contact_id,
      name: ta.contact ? `${ta.contact.first_name || ""} ${ta.contact.last_name || ""}`.trim() : "Unknown",
      isPrimary: ta.is_primary,
    })),
    created_at: t.created_at,
    updated_at: t.updated_at,
  }));

  // Get total count
  const countResult = await adminDb
    .select({ count: sql`count(*)` })
    .from(titles)
    .where(eq(titles.tenant_id, tenantId));

  return apiSuccess({
    data: transformed,
    pagination: {
      cursor: hasMore && lastItem ? encodeCursor(lastItem.id, lastItem.updated_at) : null,
      has_more: hasMore,
      total_count: Number(countResult[0]?.count || 0),
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const scopeError = requireScope(authResult.context, "write");
  if (scopeError) return scopeError;

  try {
    const body = await request.json();
    const validation = createTitleSchema.safeParse(body);

    if (!validation.success) {
      return validationError(
        Object.fromEntries(
          validation.error.errors.map(e => [e.path.join("."), e.message])
        )
      );
    }

    const tenantId = authResult.context.tenantId;
    const data = validation.data;

    const [created] = await adminDb
      .insert(titles)
      .values({
        ...data,
        tenant_id: tenantId,
      })
      .returning();

    return apiSuccess({ data: created }, 201);
  } catch (error) {
    console.error("[API] Create title error:", error);
    return apiError("server_error", "Failed to create title", 500);
  }
}
```

### Task 5: ONIX Export API

Leverage existing ONIX builder at `src/modules/onix/builder/message-builder.ts`.

**CRITICAL**: The builder uses:
- Version passed to constructor (not separate methods)
- `TitleWithAuthors` type from `src/modules/title-authors/queries.ts`
- Single `toXML()` method for all versions

```typescript
// src/app/api/v1/onix/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { authenticateApiRequest, requireScope } from "@/modules/api/middleware/auth-middleware";
import { adminDb } from "@/db";
import { titles } from "@/db/schema/titles";
import { tenants } from "@/db/schema/tenants";
import { titleAuthors } from "@/db/schema/title-authors";
import { ONIXMessageBuilder } from "@/modules/onix/builder/message-builder";
import type { ONIXVersion } from "@/modules/onix/parser/types";
import { apiError } from "@/modules/api/utils/response";

const querySchema = z.object({
  title_ids: z.string().optional(), // comma-separated UUIDs
  version: z.enum(["3.1", "3.0"]).default("3.1"),
  since: z.string().datetime().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return scopeError;

  const { searchParams } = new URL(request.url);
  const queryResult = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!queryResult.success) {
    return apiError("validation_error", "Invalid query parameters", 400);
  }

  const { title_ids, version, since } = queryResult.data;
  const tenantId = authResult.context.tenantId;

  // Build conditions
  const conditions = [eq(titles.tenant_id, tenantId)];

  if (title_ids) {
    const ids = title_ids.split(",").filter(Boolean);
    conditions.push(inArray(titles.id, ids));
  }

  if (since) {
    conditions.push(gt(titles.updated_at, new Date(since)));
  }

  // Fetch titles with authors (TitleWithAuthors format)
  const titlesData = await adminDb.query.titles.findMany({
    where: and(...conditions),
    with: {
      titleAuthors: {
        with: { contact: true },
        orderBy: [desc(titleAuthors.is_primary)],
      },
    },
  });

  // Get tenant info for ONIX header
  const tenant = await adminDb.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) {
    return apiError("server_error", "Tenant not found", 500);
  }

  // Build ONIX message - version passed to constructor
  const onixVersion: ONIXVersion = version as ONIXVersion;
  const builder = new ONIXMessageBuilder(tenantId, tenant, onixVersion);

  // Transform to TitleWithAuthors format expected by builder
  for (const title of titlesData) {
    const titleWithAuthors = {
      ...title,
      authors: title.titleAuthors?.map(ta => ({
        contact_id: ta.contact_id,
        is_primary: ta.is_primary,
        ownership_percentage: ta.ownership_percentage,
        contact: ta.contact,
      })) || [],
    };
    builder.addTitle(titleWithAuthors);
  }

  // Single toXML() method - version already set in constructor
  const xml = builder.toXML();

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="onix-export-${new Date().toISOString().slice(0,10)}.xml"`,
    },
  });
}
```

### Project Structure Notes

New files to create:
```
src/
├── app/api/v1/
│   ├── titles/
│   │   ├── route.ts          # GET list, POST create
│   │   └── [id]/
│   │       └── route.ts      # GET single, PUT update
│   ├── contacts/
│   │   ├── route.ts          # GET list, POST create
│   │   └── [id]/
│   │       └── route.ts      # GET single, PUT update
│   ├── sales/
│   │   ├── route.ts          # GET list, POST create/bulk
│   │   └── [id]/
│   │       └── route.ts      # GET single only
│   └── onix/
│       └── export/
│           └── route.ts      # GET ONIX XML export
└── modules/api/
    └── utils/
        ├── response.ts       # Success/error response helpers
        ├── pagination.ts     # Cursor-based pagination
        └── rate-limit-headers.ts
```

### Testing Standards

Follow existing test patterns in `tests/`:

```typescript
// tests/integration/api-titles.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Titles API", () => {
  let accessToken: string;
  let testTenantId: string;

  beforeAll(async () => {
    // Create test API key and get token
    // Set up test data
  });

  describe("GET /api/v1/titles", () => {
    it("returns 401 without auth token", async () => {
      const res = await fetch("/api/v1/titles");
      expect(res.status).toBe(401);
    });

    it("returns paginated titles for authenticated tenant", async () => {
      const res = await fetch("/api/v1/titles", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("pagination");
    });

    it("filters by publication status", async () => {
      const res = await fetch("/api/v1/titles?status=published", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.every((t: any) => t.publication_status === "published")).toBe(true);
    });

    it("isolates data by tenant", async () => {
      // Create title in tenant A
      // Try to access from tenant B token
      // Should return empty list, not 403
    });
  });

  describe("POST /api/v1/titles", () => {
    it("requires write scope", async () => {
      // Use read-only token
      const res = await fetch("/api/v1/titles", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${readOnlyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Test" }),
      });
      expect(res.status).toBe(403);
    });

    it("validates required fields", async () => {
      const res = await fetch("/api/v1/titles", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("validation_error");
    });
  });
});
```

### CRITICAL: Sales API - created_by_user_id Handling

Sales schema requires `created_by_user_id` (NOT NULL). API tokens don't have user context.

**Solution**: Each tenant has a system user for API-created records.

```typescript
// Get or create system user for API operations
async function getApiSystemUser(tenantId: string): Promise<string> {
  const systemEmail = `api-system@${tenantId}.salina.internal`;

  let user = await adminDb.query.users.findFirst({
    where: and(
      eq(users.email, systemEmail),
      eq(users.tenant_id, tenantId)
    ),
  });

  if (!user) {
    // Create system user on first API sale
    [user] = await adminDb.insert(users).values({
      email: systemEmail,
      tenant_id: tenantId,
      role: "system",
      first_name: "API",
      last_name: "System",
    }).returning();
  }

  return user.id;
}

// In POST /api/v1/sales handler:
const systemUserId = await getApiSystemUser(ctx.tenantId);
await adminDb.insert(sales).values({
  ...validatedData,
  tenant_id: ctx.tenantId,
  created_by_user_id: systemUserId, // Required field
});
```

### CRITICAL: Contacts API - Sensitive Field Exclusion

Contacts contain sensitive financial/tax data. Create a sanitization helper:

```typescript
// src/modules/api/utils/sanitize.ts
const CONTACT_SENSITIVE_FIELDS = [
  'tax_id',
  'tin_encrypted',
  'tin_type',
  'tin_last_four',
  'payment_info',
  'w9_received',
  'w9_received_date',
] as const;

export function sanitizeContact<T extends Record<string, unknown>>(contact: T): Omit<T, typeof CONTACT_SENSITIVE_FIELDS[number]> {
  const sanitized = { ...contact };
  for (const field of CONTACT_SENSITIVE_FIELDS) {
    delete sanitized[field];
  }
  return sanitized;
}
```

### Contacts API - Include Roles

Contacts have multi-role support via `contact_roles` table. Include roles in response:

```typescript
// In GET /api/v1/contacts handler
const contacts = await adminDb.query.contacts.findMany({
  where: eq(contacts.tenant_id, tenantId),
  with: {
    contactRoles: true, // Include roles
  },
});

// Transform response
const transformed = contacts.map(c => ({
  ...sanitizeContact(c),
  roles: c.contactRoles?.map(r => ({
    role: r.role,
    assigned_at: r.assigned_at,
    // Exclude role_specific_data if it contains sensitive info
  })) || [],
}));
```

### Security Checklist

1. **Tenant Isolation**: ALWAYS use `ctx.tenantId` from JWT - never trust client-provided tenant
2. **Scope Enforcement**: Check `read` for GET, `write` for POST/PUT
3. **Input Validation**: Zod schemas for all inputs
4. **SQL Injection**: Use Drizzle ORM (parameterized queries)
5. **Rate Limiting**: Headers set now, enforcement in Story 15.3
6. **Error Obfuscation**: 404 for both "not found" and "wrong tenant" to prevent enumeration
7. **No Sensitive Data**: Use `sanitizeContact()` helper - excludes ALL tax/payment fields
8. **Audit Trail**: Sales are immutable (no PUT/DELETE), use system user for API sales

### References

- [Source: docs/architecture.md - REST API (FR119-FR124)]
- [Source: docs/architecture.md - API Authentication: OAuth2 + JWT]
- [Source: docs/epics.md - Story 15.2: Build Core REST API Endpoints]
- [Source: docs/sprint-artifacts/15-1-implement-api-authentication-with-oauth2.md - Auth middleware patterns]
- [Source: src/modules/api/middleware/auth-middleware.ts - Authentication implementation]
- [Source: src/modules/titles/queries.ts - Existing title query patterns]
- [Source: src/modules/title-authors/queries.ts - TitleWithAuthors type for ONIX]
- [Source: src/modules/onix/builder/message-builder.ts - ONIXMessageBuilder interface]
- [Source: src/db/schema/contacts.ts - Contact sensitive fields to exclude]
- [Source: src/db/schema/sales.ts - Sales schema with created_by_user_id]

## Test Scenarios

### Unit Tests
- `tests/unit/api-response.test.ts`: Response helper functions
- `tests/unit/api-pagination.test.ts`: Cursor encoding/decoding, pagination params

### Integration Tests
- `tests/integration/api-titles.test.ts`: Full titles endpoint testing
- `tests/integration/api-contacts.test.ts`: Full contacts endpoint testing
- `tests/integration/api-sales.test.ts`: Full sales endpoint testing
- `tests/integration/api-onix-export.test.ts`: ONIX export testing
- `tests/integration/api-tenant-isolation.test.ts`: Cross-tenant access prevention

### Manual Testing Checklist
- [ ] Obtain token via POST /api/v1/auth/token
- [ ] GET /api/v1/titles - verify pagination works
- [ ] GET /api/v1/titles?status=published - verify filtering
- [ ] GET /api/v1/titles/:id - verify single title retrieval
- [ ] POST /api/v1/titles - create title with write token
- [ ] POST /api/v1/titles with read token - verify 403
- [ ] GET /api/v1/contacts - verify contact list
- [ ] GET /api/v1/sales?title_id=xxx - verify sales filtering
- [ ] POST /api/v1/sales (bulk) - create multiple sales
- [ ] GET /api/v1/onix/export - verify XML output
- [ ] GET /api/v1/onix/export?format=3.0 - verify 3.0 fallback
- [ ] Verify rate limit headers in all responses
- [ ] Test with revoked API key - verify 401

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

New files to create:
- `src/app/api/v1/titles/route.ts`
- `src/app/api/v1/titles/[id]/route.ts`
- `src/app/api/v1/contacts/route.ts`
- `src/app/api/v1/contacts/[id]/route.ts`
- `src/app/api/v1/sales/route.ts`
- `src/app/api/v1/sales/[id]/route.ts`
- `src/app/api/v1/onix/export/route.ts`
- `src/modules/api/utils/response.ts`
- `src/modules/api/utils/pagination.ts`
- `src/modules/api/utils/rate-limit-headers.ts`
- `src/modules/api/utils/sanitize.ts` (contact field sanitization)
- `tests/unit/api-response.test.ts`
- `tests/unit/api-pagination.test.ts`
- `tests/unit/api-sanitize.test.ts`
- `tests/integration/api-titles.test.ts`
- `tests/integration/api-contacts.test.ts`
- `tests/integration/api-sales.test.ts`
- `tests/integration/api-onix-export.test.ts`

Existing files to reference (DO NOT recreate):
- `src/modules/onix/builder/message-builder.ts` - ONIXMessageBuilder class
- `src/modules/title-authors/queries.ts` - TitleWithAuthors type and queries
- `src/modules/api/middleware/auth-middleware.ts` - Authentication (Story 15.1)
