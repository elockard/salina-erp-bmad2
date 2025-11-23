# Neon Authorize + Clerk RLS Fix

## Problem Analysis

The current implementation has RLS policies but they're not enforcing because:

1. Missing **Neon Authorize** integration with Clerk
2. No JWT authentication passed to database
3. Using manual session variables instead of Neon's built-in `auth.user_id()` function
4. No `DATABASE_AUTHENTICATED_URL` configuration

## Solution: Neon Authorize Integration

### Step 1: Configure Clerk JWT Template

1. Go to Clerk Dashboard → Configure → JWT Templates
2. Click "New template" → "Blank"
3. Name it: `neon-authorize`
4. Add custom claim:
   ```json
   {
     "userId": "{{user.id}}"
   }
   ```
5. Save and copy the **JWKS Endpoint URL** (looks like: `https://your-app.clerk.accounts.dev/.well-known/jwks.json`)

### Step 2: Configure Neon Authorize

1. Go to Neon Console → Select your project
2. Navigate to **Settings** → **RLS**
3. Click "Add Authentication Provider"
4. Paste your Clerk JWKS URL
5. Neon will auto-detect it's Clerk and create the `authenticated` role
6. Copy the **DATABASE_AUTHENTICATED_URL** (includes `?options=endpoint%3D...`)

### Step 3: Update Environment Variables

Add to `.env.local`:

```bash
# Admin connection (migrations, Studio)
DATABASE_URL="postgresql://neondb_owner:...@....neon.tech/neondb?sslmode=require"

# Authenticated connection (app queries with RLS)
DATABASE_AUTHENTICATED_URL=

# Clerk (existing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
```

### Step 4: Update Database Connection

**Current problem:** Using single `db` client without JWT authentication.

**Fix:** Create two clients - one for admin, one for authenticated users.

**File: `src/db/index.ts`**

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Admin connection for migrations/Studio
const adminSql = neon(process.env.DATABASE_URL!);
export const adminDb = drizzle(adminSql, { schema });

// Authenticated connection for app queries (requires JWT)
const authSql = neon(process.env.DATABASE_AUTHENTICATED_URL!);
export const db = drizzle(authSql, { schema });

/**
 * Get database client with JWT authentication for RLS enforcement
 * @param authToken - Clerk JWT token
 */
export function getAuthenticatedDb(authToken: string) {
  const sql = neon(process.env.DATABASE_AUTHENTICATED_URL!, {
    authToken, // Pass JWT to enable auth.user_id()
  });
  return drizzle(sql, { schema });
}
```

### Step 5: Update Middleware to Extract JWT

**File: `middleware.ts`**

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { adminDb } from "@/db"; // Use admin for tenant lookup
import { tenants } from "@/db/schema/tenants";
import { eq } from "drizzle-orm";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const host = req.headers.get("host") || "";
  const parts = host.split(".");
  const subdomain = parts.length > 1 ? parts[0] : null;

  if (subdomain) {
    try {
      // Use admin connection for tenant lookup (no RLS needed)
      const tenant = await adminDb.query.tenants.findFirst({
        where: eq(tenants.subdomain, subdomain),
      });

      if (!tenant) {
        return NextResponse.redirect(new URL("/tenant-not-found", req.url));
      }

      // Get Clerk JWT token
      const { getToken } = await auth();
      const token = await getToken({ template: "neon-authorize" });

      // Pass both tenant_id and JWT to Server Actions
      const response = NextResponse.next();
      response.headers.set("x-tenant-id", tenant.id);

      if (token) {
        response.headers.set("x-clerk-jwt", token);
      }

      if (isProtectedRoute(req)) {
        await auth.protect();
      }

      return response;
    } catch (error) {
      console.error("Middleware error:", error);
      return NextResponse.redirect(new URL("/error", req.url));
    }
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### Step 6: Update Auth Helpers

**File: `src/lib/auth.ts`**

```typescript
import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { getAuthenticatedDb } from "@/db";
import { users } from "@/db/schema/users";
import { eq, and } from "drizzle-orm";
import type { User, UserRole } from "@/db/schema";

export async function getCurrentTenantId(): Promise<string> {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) {
    throw new Error("Tenant ID not found in request context");
  }

  return tenantId;
}

/**
 * Get authenticated database client with JWT for RLS
 */
export async function getDb() {
  const headersList = await headers();
  const jwt = headersList.get("x-clerk-jwt");

  if (!jwt) {
    throw new Error("Authentication token not found");
  }

  return getAuthenticatedDb(jwt);
}

export async function getCurrentUser(): Promise<User | null> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const tenantId = await getCurrentTenantId();
  const db = await getDb(); // Uses authenticated connection with JWT

  const user = await db.query.users.findFirst({
    where: and(
      eq(users.clerk_user_id, clerkUser.id),
      eq(users.tenant_id, tenantId)
    ),
  });

  return user || null;
}

export async function checkPermission(
  allowedRoles: UserRole[]
): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  return allowedRoles.includes(user.role as UserRole);
}
```

### Step 7: Create RLS Policies Using auth.user_id()

**Create new migration: `drizzle/migrations/0002_enable_neon_authorize_rls.sql`**

```sql
-- Enable RLS on tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (cleanup from manual approach)
DROP POLICY IF EXISTS tenant_isolation_policy ON public.users;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.tenants;

-- Users table: Users can only see their own user record
CREATE POLICY "Users can view own record" ON public.users
  FOR SELECT
  TO authenticated
  USING (clerk_user_id = auth.user_id());

-- Users table: Users can only update their own record
CREATE POLICY "Users can update own record" ON public.users
  FOR UPDATE
  TO authenticated
  USING (clerk_user_id = auth.user_id())
  WITH CHECK (clerk_user_id = auth.user_id());

-- Tenants table: Users can view tenant they belong to
CREATE POLICY "Users can view their tenant" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
    )
  );

-- Tenants table: Only owners/admins can update tenant
CREATE POLICY "Owners and admins can update tenant" ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT tenant_id
      FROM public.users
      WHERE clerk_user_id = auth.user_id()
        AND role IN ('owner', 'admin')
    )
  );
```

### Step 8: Apply Migration

```bash
# Run migration manually via Neon SQL Editor OR
# Add to Drizzle migrations and run:
npm run db:migrate
```

### Step 9: Update Server Actions Pattern

**Example Server Action:**

```typescript
"use server";

import { getDb, getCurrentTenantId, checkPermission } from "@/lib/auth";
import { authors } from "@/db/schema/authors";
import { eq, and } from "drizzle-orm";

export async function getAuthors() {
  // Check permissions
  const hasPermission = await checkPermission(["owner", "admin", "editor"]);
  if (!hasPermission) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const db = await getDb(); // Authenticated connection with JWT
    const tenantId = await getCurrentTenantId();

    // Query with tenant_id filter + RLS enforces clerk_user_id
    const results = await db.query.authors.findMany({
      where: eq(authors.tenant_id, tenantId),
    });

    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: "Failed to fetch authors" };
  }
}
```

## Benefits of Neon Authorize

1. **Automatic JWT Validation**: Neon validates JWT signature automatically
2. **Built-in auth.user_id()**: No manual session variables needed
3. **Simplified Code**: Delete `getTenantDb()` wrapper, use standard queries
4. **Better Security**: JWT-based authentication at database level
5. **Scalable**: Works seamlessly with serverless Next.js
6. **Clerk Integration**: Official support, tested pattern

## Testing RLS Enforcement

**File: `tests/e2e/rls-enforcement.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test("RLS prevents cross-user data access", async ({ page }) => {
  // Test that User A cannot see User B's data even if app has bug
  // RLS should block at database level

  // Sign in as User A
  await page.goto("/sign-in");
  await page.fill('input[name="email"]', "usera@test.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  // Try to query User B's data via direct database query
  // Should return empty due to RLS

  // Verify isolation works
});
```

## Migration Checklist

- [ ] Step 1: Create Clerk JWT Template named `neon-authorize`
- [ ] Step 2: Copy JWKS URL from Clerk
- [ ] Step 3: Add Clerk as auth provider in Neon Console
- [ ] Step 4: Copy `DATABASE_AUTHENTICATED_URL` from Neon
- [ ] Step 5: Add both URLs to `.env.local`
- [ ] Step 6: Update `src/db/index.ts` with authenticated connection
- [ ] Step 7: Update `middleware.ts` to pass JWT
- [ ] Step 8: Update `src/lib/auth.ts` with `getDb()` helper
- [ ] Step 9: Create RLS migration with `auth.user_id()` policies
- [ ] Step 10: Apply RLS migration
- [ ] Step 11: Update Server Actions to use `getDb()`
- [ ] Step 12: Test RLS enforcement

## References

- [Neon Authorize + Clerk Guide](https://neon.com/docs/guides/neon-authorize-clerk)
- [Neon RLS Tutorial](https://neon.com/docs/guides/rls-tutorial)
- [Example Repository](https://github.com/neondatabase-labs/clerk-nextjs-neon-authorize)
- [Clerk JWT Templates](https://clerk.com/docs/backend-requests/making/jwt-templates)

---

**CRITICAL**: The old manual RLS approach with `SET ROLE` and `current_setting()` is deprecated. Neon Authorize is the official, supported pattern for Clerk integration.
