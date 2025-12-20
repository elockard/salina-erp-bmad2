# Story 15.1: Implement API Authentication with OAuth2

Status: completed

## Story

**As a** developer,
**I want** to authenticate API requests using API keys,
**So that** I can integrate my systems with Salina.

## Context

Epic 15 (REST API & Webhooks) enables third-party integrations through a public REST API. This first story establishes the OAuth2 authentication foundation using client_credentials flow, enabling developers to securely access Salina's API programmatically.

### OAuth2 Client Credentials Flow

Per RFC 6749, the client_credentials grant type is designed for machine-to-machine authentication where no user interaction is required:

1. Client sends API key ID + secret to token endpoint
2. Server validates credentials and returns JWT access token
3. Client includes access token in subsequent API requests
4. Token expires after 15 minutes, client re-authenticates

### Dependencies
- Epic 1 (Authentication) - Complete (provides Clerk user context)
- No external dependencies - self-contained authentication system

### Business Value
- Enables third-party system integrations (inventory, accounting, CRM)
- Allows publishers to automate data sync workflows
- Foundation for Stories 15.2-15.6 (API endpoints, rate limiting, webhooks)
- Industry-standard security (OAuth2 + JWT)

### Existing Infrastructure to Reference
From Epic 16/17 (Channel Adapters):
- `channel_credentials` table pattern for secure credential storage
- `encryptCredentials`/`decryptCredentials` from `src/lib/channel-encryption.ts`
- Server action patterns with tenant isolation

## Acceptance Criteria

### AC1: API Key Generation
- **Given** I am a tenant owner or admin
- **When** I navigate to Settings > API Keys
- **Then** I can create a new API key with:
  - Name/label (e.g., "Production Integration", "Development")
  - Optional description
  - Scopes selection (read, write, admin)
- **And** system generates a unique key pair:
  - API Key ID (20 characters, alphanumeric, prefix `sk_live_` or `sk_test_`)
  - API Secret (40 characters, cryptographically random)
- **And** secret is shown ONCE at creation (cannot be retrieved later)
- **And** secret must be copied before dialog closes

### AC2: API Key Management
- **Given** I have existing API keys
- **When** I access Settings > API Keys
- **Then** I can view list of active API keys showing:
  - Key name/label
  - Key ID (full, not masked)
  - Created date
  - Last used date
  - Scopes
  - Status (active/revoked)
- **And** I can revoke API keys (soft delete)
- **And** revoked keys cannot be reactivated

### AC3: OAuth2 Token Endpoint
- **Given** I have valid API credentials
- **When** I POST to `/api/v1/auth/token` with:
  ```json
  {
    "grant_type": "client_credentials",
    "client_id": "<api_key_id>",
    "client_secret": "<api_secret>"
  }
  ```
- **Then** system returns JWT access token:
  ```json
  {
    "access_token": "<jwt>",
    "token_type": "Bearer",
    "expires_in": 900
  }
  ```
- **And** JWT contains claims: `tenant_id`, `key_id`, `scopes`, `iat`, `exp`

### AC4: Token Validation
- **Given** API request includes `Authorization: Bearer <token>` header
- **When** system validates the token
- **Then** system verifies:
  - Token signature is valid (HMAC-SHA256)
  - Token is not expired (15-minute TTL)
  - Key has not been revoked
  - Key scopes allow the requested operation
- **And** request context includes tenant_id from token

### AC5: Authentication Failures
- **Given** invalid credentials or token
- **When** authentication fails
- **Then** system returns appropriate error:
  - 401 Unauthorized for invalid/expired credentials
  - 403 Forbidden for insufficient scopes
- **And** error response includes:
  ```json
  {
    "error": "invalid_grant",
    "error_description": "API key not found or revoked"
  }
  ```
- **And** failed attempts are logged for security monitoring

### AC6: Secure Storage
- **Given** API credentials are stored
- **Then** secret is hashed using bcrypt (cost factor 12)
- **And** only hashed secret stored in database (never plaintext)
- **And** API keys are tenant-isolated (RLS)
- **And** only owner/admin roles can manage keys

## Tasks

- [x] Task 1 (AC: 6): Create `api_keys` database schema with tenant isolation
- [x] Task 2 (AC: 1, 6): Implement secure API key generation with bcrypt hashing
- [x] Task 3 (AC: 3, 4): Create OAuth2 token endpoint with JWT generation
- [x] Task 4 (AC: 4): Create auth middleware for API routes
- [x] Task 5 (AC: 1, 2): Create API key management server actions
- [x] Task 6 (AC: 1, 2): Build API Keys settings page with create/list/revoke UI
- [x] Task 7 (AC: 5): Implement authentication error responses per RFC 6749
- [x] Task 8 (AC: 1-6): Write comprehensive tests

## Dev Notes

### CRITICAL: Package Installation Required

```bash
npm install jose bcryptjs
npm install -D @types/bcryptjs
```

### CRITICAL: New Module Structure

Create new module at `src/modules/api/` following architecture specification:

```
src/modules/api/
├── auth/
│   ├── token-service.ts      # JWT generation/validation
│   ├── api-key-service.ts    # Key generation, hashing, validation
│   └── types.ts              # Auth-specific types
├── middleware/
│   ├── auth-middleware.ts    # Bearer token validation
│   └── tenant-scope.ts       # Tenant context from token
├── actions.ts                # Server actions for key management
├── queries.ts                # Read queries (listApiKeys, etc.)
├── schema.ts                 # Zod schemas for API key forms
└── types.ts                  # Module types
```

### Task 1: Database Schema

Create `src/db/schema/api-keys.ts`:

```typescript
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
    activeKeysIdx: index("api_keys_active_idx").on(table.tenantId, table.revokedAt),
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
```

**Migration Steps:**

1. Add to `src/db/schema/index.ts`:
```typescript
// Add export
export * from "./api-keys";

// Add to type imports section
import type { apiKeys } from "./api-keys";

// Add to exported types section
export type ApiKey = typeof apiKeys.$inferSelect;
```

2. Generate and run migration:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

3. Add RLS policy (in migration SQL or manually):
```sql
-- RLS Policy for api_keys table (tenant isolation)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_tenant_isolation ON api_keys
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Grant access to application role
GRANT ALL ON api_keys TO authenticated;
```

**Audit Logging:** Add `"api_key"` to `auditResourceTypeValues` array in `src/db/schema/audit-logs.ts` for compliance tracking of key creation/revocation.

### Task 2: API Key Generation Service

Create `src/modules/api/auth/api-key-service.ts`:

```typescript
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;
const KEY_ID_LENGTH = 20;
const SECRET_LENGTH = 40;

/**
 * Generate API key pair
 *
 * Story 15.1 - AC1: API Key Generation
 *
 * @returns Key ID (sk_live_xxx), plaintext secret (shown once), hashed secret (stored)
 */
export async function generateApiKeyPair(isTest: boolean = false): Promise<{
  keyId: string;
  plaintextSecret: string;
  secretHash: string;
}> {
  const prefix = isTest ? "sk_test_" : "sk_live_";

  // Generate cryptographically random key ID (alphanumeric)
  const keyIdRandom = randomBytes(KEY_ID_LENGTH)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, KEY_ID_LENGTH);
  const keyId = `${prefix}${keyIdRandom}`;

  // Generate cryptographically random secret
  const plaintextSecret = randomBytes(SECRET_LENGTH)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, SECRET_LENGTH);

  // Hash secret with bcrypt
  const secretHash = await bcrypt.hash(plaintextSecret, BCRYPT_COST);

  return { keyId, plaintextSecret, secretHash };
}

/**
 * Verify API secret against stored hash
 *
 * Story 15.1 - AC3: Token Endpoint validation
 */
export async function verifyApiSecret(
  plaintextSecret: string,
  secretHash: string
): Promise<boolean> {
  return bcrypt.compare(plaintextSecret, secretHash);
}
```

### Task 3: JWT Token Service

Create `src/modules/api/auth/token-service.ts`:

```typescript
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.API_JWT_SECRET || process.env.CLERK_SECRET_KEY // Fallback to Clerk secret
);
const JWT_ISSUER = "salina-erp";
const JWT_AUDIENCE = "salina-api";
const TOKEN_EXPIRY = "15m"; // 15 minutes per architecture spec

/**
 * JWT payload for API access tokens
 */
export interface ApiTokenPayload extends JWTPayload {
  tenant_id: string;
  key_id: string;
  scopes: string[];
}

/**
 * Generate JWT access token
 *
 * Story 15.1 - AC3: OAuth2 Token Endpoint
 */
export async function generateAccessToken(
  tenantId: string,
  keyId: string,
  scopes: string[]
): Promise<string> {
  const token = await new SignJWT({
    tenant_id: tenantId,
    key_id: keyId,
    scopes,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode JWT access token
 *
 * Story 15.1 - AC4: Token Validation
 */
export async function verifyAccessToken(
  token: string
): Promise<ApiTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as ApiTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}
```

### Task 4: Auth Middleware

Create `src/modules/api/middleware/auth-middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { adminDb } from "@/db";
import { apiKeys } from "@/db/schema/api-keys";
import {
  verifyAccessToken,
  extractBearerToken,
  type ApiTokenPayload,
} from "../auth/token-service";

/**
 * API request context after authentication
 */
export interface ApiContext {
  tenantId: string;
  keyId: string;
  scopes: string[];
}

/**
 * OAuth2 error response per RFC 6749
 */
function oauthError(
  error: string,
  description: string,
  status: number
): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status }
  );
}

/**
 * Authenticate API request
 *
 * Story 15.1 - AC4: Token Validation
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<{ context: ApiContext } | { error: NextResponse }> {
  const authHeader = request.headers.get("Authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      error: oauthError(
        "invalid_request",
        "Missing or invalid Authorization header",
        401
      ),
    };
  }

  // Verify JWT
  const payload = await verifyAccessToken(token);
  if (!payload) {
    return {
      error: oauthError("invalid_token", "Token is invalid or expired", 401),
    };
  }

  // Verify key is still active (not revoked)
  const apiKey = await adminDb.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.keyId, payload.key_id),
      isNull(apiKeys.revokedAt)
    ),
  });

  if (!apiKey) {
    return {
      error: oauthError("invalid_token", "API key has been revoked", 401),
    };
  }

  // Update last used timestamp (fire and forget)
  adminDb
    .update(apiKeys)
    .set({
      lastUsedAt: new Date(),
      lastUsedIp: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
    })
    .where(eq(apiKeys.id, apiKey.id))
    .execute()
    .catch(console.error);

  return {
    context: {
      tenantId: payload.tenant_id,
      keyId: payload.key_id,
      scopes: payload.scopes,
    },
  };
}

/**
 * Check if context has required scope
 *
 * Story 15.1 - AC4: Scope checking
 */
export function hasScope(context: ApiContext, requiredScope: string): boolean {
  // Admin scope has all permissions
  if (context.scopes.includes("admin")) return true;
  // Write scope includes read
  if (requiredScope === "read" && context.scopes.includes("write")) return true;
  // Direct match
  return context.scopes.includes(requiredScope);
}

/**
 * Require scope middleware helper
 */
export function requireScope(
  context: ApiContext,
  requiredScope: string
): NextResponse | null {
  if (!hasScope(context, requiredScope)) {
    return oauthError(
      "insufficient_scope",
      `This operation requires '${requiredScope}' scope`,
      403
    );
  }
  return null;
}
```

### Task 5: OAuth2 Token Endpoint

Create `src/app/api/v1/auth/token/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { adminDb } from "@/db";
import { apiKeys } from "@/db/schema/api-keys";
import { verifyApiSecret } from "@/modules/api/auth/api-key-service";
import { generateAccessToken } from "@/modules/api/auth/token-service";

/**
 * OAuth2 Token Endpoint
 *
 * Story 15.1 - AC3: OAuth2 client_credentials flow
 * Reference: RFC 6749 Section 4.4
 *
 * POST /api/v1/auth/token
 * Content-Type: application/json
 *
 * {
 *   "grant_type": "client_credentials",
 *   "client_id": "sk_live_xxx",
 *   "client_secret": "secret"
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate grant type
    if (body.grant_type !== "client_credentials") {
      return NextResponse.json(
        {
          error: "unsupported_grant_type",
          error_description: "Only client_credentials grant type is supported",
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.client_id || !body.client_secret) {
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description: "client_id and client_secret are required",
        },
        { status: 400 }
      );
    }

    // Find API key by key ID
    const apiKey = await adminDb.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.keyId, body.client_id),
        isNull(apiKeys.revokedAt)
      ),
    });

    if (!apiKey) {
      // Log failed attempt for security monitoring (AC5)
      console.warn(`[API Auth] Failed auth attempt for key: ${body.client_id}`);

      return NextResponse.json(
        {
          error: "invalid_grant",
          error_description: "API key not found or revoked",
        },
        { status: 401 }
      );
    }

    // Verify secret
    const isValid = await verifyApiSecret(body.client_secret, apiKey.secretHash);
    if (!isValid) {
      console.warn(`[API Auth] Invalid secret for key: ${body.client_id}`);

      return NextResponse.json(
        {
          error: "invalid_grant",
          error_description: "Invalid API secret",
        },
        { status: 401 }
      );
    }

    // Generate JWT access token
    const accessToken = await generateAccessToken(
      apiKey.tenantId,
      apiKey.keyId,
      apiKey.scopes
    );

    // Update last used (fire and forget)
    adminDb
      .update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        lastUsedIp: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      })
      .where(eq(apiKeys.id, apiKey.id))
      .execute()
      .catch(console.error);

    // Return OAuth2 token response
    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 900, // 15 minutes in seconds
    });
  } catch (error) {
    console.error("[API Auth] Token endpoint error:", error);

    return NextResponse.json(
      {
        error: "server_error",
        error_description: "Internal server error",
      },
      { status: 500 }
    );
  }
}
```

### Task 6: Server Actions for Key Management

Create `src/modules/api/actions.ts`:

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, adminDb } from "@/db";
import { users } from "@/db/schema";
import { apiKeys, type ApiScope } from "@/db/schema/api-keys";
import { generateApiKeyPair } from "./auth/api-key-service";
import { apiKeyCreateSchema, type ApiKeyCreateInput } from "./schema";

/**
 * Get authenticated user with owner/admin check
 */
async function getAuthenticatedAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const user = await db.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) throw new Error("No tenant context");
  if (!["owner", "admin"].includes(user.role)) {
    throw new Error("Only owner/admin can manage API keys");
  }

  return user;
}

/**
 * Create new API key
 *
 * Story 15.1 - AC1: API Key Generation
 *
 * @returns Object with keyId and plaintextSecret (secret shown once only)
 */
export async function createApiKey(
  input: ApiKeyCreateInput
): Promise<{
  success: boolean;
  keyId?: string;
  plaintextSecret?: string;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedAdmin();

    const validation = apiKeyCreateSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.message };
    }

    // Generate key pair
    const { keyId, plaintextSecret, secretHash } = await generateApiKeyPair(
      input.isTest ?? false
    );

    // Insert key
    await db.insert(apiKeys).values({
      tenantId: user.tenant_id,
      name: input.name,
      description: input.description,
      keyId,
      secretHash,
      scopes: input.scopes as ApiScope[],
      isTest: input.isTest ?? false,
      createdBy: user.id,
    });

    revalidatePath("/settings/api-keys");

    // Return secret - THIS IS THE ONLY TIME IT CAN BE RETRIEVED
    return {
      success: true,
      keyId,
      plaintextSecret,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create API key",
    };
  }
}

/**
 * List API keys for current tenant
 *
 * Story 15.1 - AC2: API Key Management
 */
export async function listApiKeys(): Promise<{
  success: boolean;
  keys?: Array<{
    id: string;
    name: string;
    keyId: string;
    description: string | null;
    scopes: string[];
    isTest: boolean;
    createdAt: Date;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
  }>;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedAdmin();

    const keys = await adminDb.query.apiKeys.findMany({
      where: eq(apiKeys.tenantId, user.tenant_id),
      orderBy: [desc(apiKeys.createdAt)],
    });

    return {
      success: true,
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyId: k.keyId,
        description: k.description,
        scopes: k.scopes,
        isTest: k.isTest,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        revokedAt: k.revokedAt,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list API keys",
    };
  }
}

/**
 * Revoke API key (soft delete)
 *
 * Story 15.1 - AC2: Revoke keys
 */
export async function revokeApiKey(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedAdmin();

    // Verify key belongs to tenant
    const key = await adminDb.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.keyId, keyId),
        eq(apiKeys.tenantId, user.tenant_id),
        isNull(apiKeys.revokedAt)
      ),
    });

    if (!key) {
      return { success: false, error: "API key not found or already revoked" };
    }

    await db
      .update(apiKeys)
      .set({
        revokedAt: new Date(),
        revokedBy: user.id,
      })
      .where(eq(apiKeys.id, key.id));

    revalidatePath("/settings/api-keys");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke API key",
    };
  }
}
```

### Task 7: Zod Schemas

Create `src/modules/api/schema.ts`:

```typescript
import { z } from "zod";
import { API_SCOPES } from "@/db/schema/api-keys";

/**
 * API Key creation schema
 *
 * Story 15.1 - AC1: API Key Generation
 */
export const apiKeyCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less"),
  description: z.string().max(1000).optional(),
  scopes: z
    .array(z.enum([API_SCOPES.READ, API_SCOPES.WRITE, API_SCOPES.ADMIN]))
    .min(1, "At least one scope is required"),
  isTest: z.boolean().optional(),
});

export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;

/**
 * OAuth2 token request schema
 */
export const tokenRequestSchema = z.object({
  grant_type: z.literal("client_credentials"),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export type TokenRequest = z.infer<typeof tokenRequestSchema>;
```

### Task 8: API Keys Settings Page

Create `src/app/(dashboard)/settings/api-keys/page.tsx`:

```typescript
import { Suspense } from "react";
import { ApiKeysManager } from "@/modules/api/components/api-keys-manager";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
        <p className="text-muted-foreground">
          Manage API keys for programmatic access to Salina. Keys use OAuth2
          client_credentials flow.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ApiKeysManager />
      </Suspense>
    </div>
  );
}
```

### UI Component Structure

Create `src/modules/api/components/api-keys-manager.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Copy, Key, AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createApiKey, listApiKeys, revokeApiKey } from "../actions";
import { apiKeyCreateSchema, type ApiKeyCreateInput } from "../schema";
import { API_SCOPES } from "@/db/schema/api-keys";

interface ApiKeyRow {
  id: string;
  name: string;
  keyId: string;
  description: string | null;
  scopes: string[];
  isTest: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export function ApiKeysManager() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<{
    keyId: string;
    secret: string;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<ApiKeyCreateInput>({
    resolver: zodResolver(apiKeyCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      scopes: ["read"],
      isTest: false,
    },
  });

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    const result = await listApiKeys();
    if (result.success && result.keys) {
      setKeys(result.keys);
    }
    setLoading(false);
  }

  async function onCreateSubmit(data: ApiKeyCreateInput) {
    setIsCreating(true);
    const result = await createApiKey(data);
    setIsCreating(false);

    if (result.success && result.keyId && result.plaintextSecret) {
      setCreatedKey({
        keyId: result.keyId,
        secret: result.plaintextSecret,
      });
      form.reset();
      loadKeys();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create API key",
        variant: "destructive",
      });
    }
  }

  async function handleRevoke(keyId: string, name: string) {
    const result = await revokeApiKey(keyId);
    if (result.success) {
      toast({ title: "API key revoked", description: `"${name}" has been revoked` });
      loadKeys();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to revoke API key",
        variant: "destructive",
      });
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  }

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <div className="space-y-6">
      {/* Create Key Dialog */}
      <Dialog
        open={createOpen || !!createdKey}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setCreatedKey(null);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create API Key
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>
                  Copy your secret key now. You won't be able to see it again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    This is the only time your secret will be displayed. Store it
                    securely.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key ID</label>
                  <div className="flex gap-2">
                    <Input value={createdKey.keyId} readOnly className="font-mono" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(createdKey.keyId, "Key ID")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Secret Key</label>
                  <div className="flex gap-2">
                    <Input
                      value={createdKey.secret}
                      readOnly
                      className="font-mono"
                      type="text"  // Show plaintext - user needs to copy it
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(createdKey.secret, "Secret")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setCreatedKey(null)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Generate a new API key for programmatic access.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onCreateSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Production Integration"
                          />
                        </FormControl>
                        <FormDescription>
                          A label to identify this key
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
                          <Input {...field} placeholder="Used for inventory sync" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scopes"
                    render={() => (
                      <FormItem>
                        <FormLabel>Scopes</FormLabel>
                        <div className="space-y-2">
                          {Object.values(API_SCOPES).map((scope) => (
                            <FormField
                              key={scope}
                              control={form.control}
                              name="scopes"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(scope)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, scope]);
                                        } else {
                                          field.onChange(
                                            current.filter((s) => s !== scope)
                                          );
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <span className="text-sm capitalize">{scope}</span>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormDescription>
                          read: Read data | write: Create/update | admin: Full access
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isTest"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <span className="text-sm">Test key (sk_test_ prefix)</span>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Key
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Active Keys */}
      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
          <CardDescription>
            Keys currently enabled for API access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : activeKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No API keys created yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key ID</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{key.name}</span>
                        {key.isTest && (
                          <Badge variant="outline" className="ml-2">
                            Test
                          </Badge>
                        )}
                      </div>
                      {key.description && (
                        <span className="text-sm text-muted-foreground">
                          {key.description}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{key.keyId}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary" className="capitalize">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(key.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      {key.lastUsedAt
                        ? formatDistanceToNow(new Date(key.lastUsedAt), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will immediately invalidate all tokens for "{key.name}".
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevoke(key.keyId, key.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revoked Keys</CardTitle>
            <CardDescription>
              Previously active keys that have been revoked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key ID</TableHead>
                  <TableHead>Revoked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revokedKeys.map((key) => (
                  <TableRow key={key.id} className="opacity-60">
                    <TableCell>{key.name}</TableCell>
                    <TableCell className="font-mono text-sm">{key.keyId}</TableCell>
                    <TableCell>
                      {key.revokedAt &&
                        formatDistanceToNow(new Date(key.revokedAt), {
                          addSuffix: true,
                        })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Environment Variables

Add to `.env.example`:

```
# API Authentication (Story 15.1)
API_JWT_SECRET=your-32-character-secret-key-here
```

**Generate secure secret:**
```bash
# Generate cryptographically secure 32-byte secret
openssl rand -base64 32
```

**IMPORTANT:** Never commit actual secrets. Use different secrets per environment.

### Security Checklist

1. **Never log secrets** - Not plaintext, not hashed
2. **Bcrypt for storage** - Cost factor 12, never plaintext
3. **JWT for transport** - Short TTL (15 min), signed with HS256
4. **Tenant isolation** - RLS on api_keys table
5. **Role enforcement** - Owner/admin only for key management
6. **Secret shown once** - No retrieval after creation dialog closes
7. **Revocation is permanent** - Soft delete, cannot reactivate
8. **IP logging** - Track last used IP for security monitoring
9. **Key limits** - Consider enforcing max 10 keys per tenant to prevent abuse

### Test vs Live Keys

- `sk_test_` prefix keys are for development/testing
- `sk_live_` prefix keys are for production use
- Future stories (15.3) may implement different rate limits for test keys
- Both key types use the same authentication flow in this story

### Settings Navigation Update

**CRITICAL:** Update `src/app/(dashboard)/settings/layout.tsx` to add API Keys tab:

```typescript
const settingsNav = [
  { href: "/settings", label: "General", exact: true },
  { href: "/settings/users", label: "Users", exact: false },
  { href: "/settings/api-keys", label: "API Keys", exact: false },  // ADD THIS LINE
  { href: "/settings/isbn-import", label: "ISBN Import", exact: false },
  { href: "/settings/isbn-prefixes", label: "ISBN Prefixes", exact: false },
  { href: "/settings/integrations", label: "Integrations", exact: false },
];
```

### References

- [Source: docs/architecture.md - REST API (FR119-FR124)]
- [Source: docs/architecture.md - API Authentication: OAuth2 + JWT, RFC 6749/7519]
- [Source: docs/epics.md - Epic 15: REST API & Webhooks]
- [Source: docs/epics.md - Story 15.1: Implement API Authentication with OAuth2]
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7519 - JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)

## Test Scenarios

### Unit Tests (`tests/unit/api-key-service.test.ts`)
- generateApiKeyPair produces correct key ID format (sk_live_/sk_test_ prefix)
- generateApiKeyPair produces cryptographically random values
- Generated keys are unique across multiple calls
- verifyApiSecret returns true for valid secret/hash pair
- verifyApiSecret returns false for invalid secret
- bcrypt cost factor is 12

### Unit Tests (`tests/unit/token-service.test.ts`)
- generateAccessToken produces valid JWT
- JWT contains required claims (tenant_id, key_id, scopes, iat, exp)
- verifyAccessToken validates correct tokens
- verifyAccessToken rejects expired tokens
- verifyAccessToken rejects tokens with invalid signature
- extractBearerToken extracts token from header
- extractBearerToken returns null for invalid headers

### Unit Tests (`tests/unit/auth-middleware.test.ts`)
- authenticateApiRequest validates bearer token
- authenticateApiRequest returns 401 for missing token
- authenticateApiRequest returns 401 for invalid token
- authenticateApiRequest returns 401 for revoked key
- hasScope correctly checks scope hierarchy
- requireScope returns 403 for insufficient scope

### Integration Tests (`tests/integration/api-auth.test.ts`)
- POST /api/v1/auth/token returns JWT for valid credentials
- POST /api/v1/auth/token returns 401 for invalid client_id
- POST /api/v1/auth/token returns 401 for invalid client_secret
- POST /api/v1/auth/token returns 400 for invalid grant_type
- Token endpoint updates lastUsedAt timestamp
- Revoked key cannot obtain new tokens

### Server Action Tests (`tests/unit/api-actions.test.ts`)
- createApiKey requires owner/admin role
- createApiKey generates and stores key correctly
- createApiKey returns plaintext secret only once
- listApiKeys returns keys for current tenant only
- revokeApiKey soft deletes key
- revokeApiKey prevents reactivation

### Manual Testing Checklist
- [ ] Navigate to Settings > API Keys
- [ ] Create new API key with name and scopes
- [ ] Verify secret is shown and can be copied
- [ ] Verify secret cannot be retrieved after closing dialog
- [ ] Use key to obtain token via curl:
  ```bash
  curl -X POST http://localhost:3000/api/v1/auth/token \
    -H "Content-Type: application/json" \
    -d '{"grant_type":"client_credentials","client_id":"sk_live_xxx","client_secret":"secret"}'
  ```
- [ ] Verify JWT contains correct claims (decode at jwt.io)
- [ ] Use token in Authorization header for API request
- [ ] Revoke key and verify token requests fail
- [ ] Non-admin users cannot access API Keys settings

## Dev Agent Record

### Context Reference

This story establishes the REST API authentication foundation. It implements OAuth2 client_credentials flow which is the industry standard for machine-to-machine authentication. The pattern differs from Clerk (user authentication) in that:
- No user session required
- API keys are tenant-scoped, not user-scoped
- Tokens are short-lived (15 min) for security
- Secret is hashed with bcrypt, never stored plaintext

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Implemented bcrypt with cost 12 for secret hashing
- JWT signed with HS256, 15-minute expiry
- Used jose library for JWT operations
- Used bcryptjs for password hashing (pure JS, works in Edge)
- Key format: sk_live_ or sk_test_ + 20 random alphanumeric
- Secret: 40 random alphanumeric characters
- Soft delete for revocation (revokedAt timestamp)
- Tracking lastUsedAt and lastUsedIp for security monitoring
- `getAuthenticatedAdmin()` pattern follows existing channel adapter actions
- Added API Keys tab to settings navigation
- 33 unit tests passing (api-key-service, token-service, auth-middleware)
- Used sonner for toast notifications (consistent with codebase)

### File List

New files:
- `src/db/schema/api-keys.ts` - Database schema with indexes
- `src/modules/api/auth/api-key-service.ts` - Key generation and verification
- `src/modules/api/auth/token-service.ts` - JWT generation and verification
- `src/modules/api/middleware/auth-middleware.ts` - Request authentication
- `src/modules/api/actions.ts` - Server actions for key management
- `src/modules/api/schema.ts` - Zod validation schemas
- `src/modules/api/components/api-keys-manager.tsx` - UI component
- `src/app/api/v1/auth/token/route.ts` - OAuth2 token endpoint
- `src/app/(dashboard)/settings/api-keys/page.tsx` - Settings page
- `tests/unit/api-key-service.test.ts` - 8 tests
- `tests/unit/token-service.test.ts` - 15 tests
- `tests/unit/auth-middleware.test.ts` - 10 tests
- `drizzle/migrations/0002_majestic_nightshade.sql` - DB migration

Modified files:
- `src/db/schema/index.ts` - Export api_keys schema and ApiKey type
- `src/db/schema/audit-logs.ts` - Add "api_key" to auditResourceTypeValues
- `src/db/schema/relations.ts` - Add apiKeys relation to tenants and apiKeysRelations
- `src/app/(dashboard)/settings/layout.tsx` - Add "API Keys" to settingsNav

### Change Log

- 2025-12-17: Story 15.1 implementation complete - OAuth2 API authentication with API keys
