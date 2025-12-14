# Story 13.1: Implement Platform Administrator Authentication

Status: done

## Story

As a **platform administrator**,
I want to **authenticate separately from tenant users**,
so that **platform admin access is secure and distinct from customer access**.

## Acceptance Criteria

1. **Given** I am a designated platform administrator **When** I access the platform admin area **Then** I authenticate using platform admin credentials

2. Platform admin authentication is separate from tenant Clerk auth

3. Platform admins are defined by email whitelist in environment configuration (`PLATFORM_ADMIN_EMAILS`)

4. Platform admin sessions are separate from tenant user sessions

5. The platform admin area is accessible at `/platform-admin` route

6. Non-platform-admins receive 403 Forbidden on platform admin routes

7. Platform admin authentication events are logged to platform audit trail

## Tasks / Subtasks

- [x] **Task 1: Update Middleware for Platform Admin Routes** (AC: 1, 2, 4, 5)
  - [x] Open `src/proxy.ts`
  - [x] Add `/platform-admin(.*)` to `isProtectedRoute` matcher
  - [x] Add early return for platform-admin routes BEFORE tenant lookup (line ~50)
  - [x] Platform admin routes should NOT set `x-tenant-id` header
  - [x] Verify Clerk auth still works for platform admin routes

- [x] **Task 2: Create Platform Admin Environment Configuration** (AC: 3)
  - [x] Add `PLATFORM_ADMIN_EMAILS` to `.env.example` with documentation
  - [x] Add `TEST_PLATFORM_ADMIN_EMAIL` and `TEST_PLATFORM_ADMIN_PASSWORD` for testing
  - [x] Define format: comma-separated email list (e.g., `admin@example.com,ops@example.com`)

- [x] **Task 3: Create Platform Admin Auth Helpers** (AC: 1, 2, 4, 6)
  - [x] Create `src/lib/platform-admin.ts`
  - [x] Implement `isPlatformAdmin(email: string)` - checks email against env whitelist
  - [x] Implement `requirePlatformAdmin()` - redirects if not admin
  - [x] Implement `getCurrentPlatformAdmin()` - returns admin info or null

- [x] **Task 4: Create Platform Audit Log Table** (AC: 7)
  - [x] Create `src/db/schema/platform-audit-logs.ts` (separate from tenant audit logs)
  - [x] Schema: id, admin_email, admin_clerk_id, action, route, metadata, created_at
  - [x] NO tenant_id (platform-level logging)
  - [x] Create migration file
  - [x] Run `pnpm drizzle-kit generate` and `pnpm drizzle-kit push`

- [x] **Task 5: Create Platform Audit Logger** (AC: 7)
  - [x] Create `src/lib/platform-audit.ts`
  - [x] Implement `logPlatformAdminEvent()` - fire-and-forget pattern
  - [x] Use `adminDb` for inserts (no RLS needed)
  - [x] Log: access, forbidden, actions

- [x] **Task 6: Create Platform Admin Route Group** (AC: 5)
  - [x] Create `src/app/(platform-admin)/layout.tsx`
  - [x] Create `src/app/(platform-admin)/platform-admin/page.tsx`
  - [x] Apply auth check in layout via `requirePlatformAdmin()`
  - [x] Log access via `logPlatformAdminEvent()`
  - [x] Include sign-out button using Clerk's `<SignOutButton>`
  - [x] Add "Back to Tenant App" link for admins who also have tenant roles

- [x] **Task 7: Create Platform Admin Landing Page Content** (AC: 5)
  - [x] Display welcome message with admin name/email
  - [x] Show placeholder cards for upcoming features:
    - Tenant Management (Story 13.2-13.4)
    - Platform Analytics (Story 13.5)
    - Impersonation (Story 13.6)
    - System Health (Story 13.7)
    - Announcements (Story 13.8)
  - [x] Style as "Coming Soon" with descriptions

- [x] **Task 8: Create 403 Forbidden Page** (AC: 6)
  - [x] Create `src/app/(platform-admin)/forbidden/page.tsx`
  - [x] Display: "You do not have platform administrator access"
  - [x] Log forbidden attempt via `logPlatformAdminEvent()`
  - [x] Provide link back to main application

- [x] **Task 9: Write Tests** (All ACs)
  - [x] Unit: `isPlatformAdmin()` returns true for whitelisted emails
  - [x] Unit: `isPlatformAdmin()` returns false for non-whitelisted emails
  - [x] Unit: Case-insensitive email matching
  - [x] Unit: Empty whitelist returns false for all
  - [x] Unit: Handles whitespace in email list
  - [x] Unit: Handles single email in whitelist
  - [x] Unit: Handles missing PLATFORM_ADMIN_EMAILS env var
  - [x] Unit: logPlatformAdminEvent logs access events
  - [x] Unit: logPlatformAdminEvent logs forbidden events
  - [x] Unit: logPlatformAdminEvent includes metadata when provided
  - [x] Unit: logPlatformAdminEvent does not throw on database error (fire-and-forget)

## Dev Notes

### Critical: Middleware Modification Required

**The `src/proxy.ts` file MUST be modified.** Current middleware tries to resolve tenant for ALL protected routes. Platform admin routes have NO tenant context.

**Required change in `src/proxy.ts`:**

```typescript
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
  "/portal(.*)",
  "/sales(.*)",
  "/authors(.*)",
  "/titles(.*)",
  "/isbn-pool(.*)",
  "/returns(.*)",
  "/royalties(.*)",
  "/statements(.*)",
  "/reports(.*)",
  "/admin(.*)",
  "/contacts(.*)",
  "/invoices(.*)",
  "/platform-admin(.*)",  // ADD THIS
]);

// ADD: Platform admin route matcher (separate from tenant routes)
const isPlatformAdminRoute = createRouteMatcher(["/platform-admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // ... existing subdomain extraction ...

  // ADD: Handle platform admin routes BEFORE tenant lookup
  if (isPlatformAdminRoute(req)) {
    await auth.protect(); // Require Clerk auth
    return NextResponse.next(); // No tenant context needed
  }

  // ... rest of existing middleware (tenant lookup, etc.) ...
});
```

### Critical: Separate Platform Audit Log Table

**DO NOT use the existing `audit_logs` table** - it requires `tenant_id` which platform admin doesn't have.

**Create new table `platform_audit_logs`:**

```typescript
// src/db/schema/platform-audit-logs.ts
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const platformAuditLogs = pgTable("platform_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  admin_email: text("admin_email").notNull(),
  admin_clerk_id: text("admin_clerk_id").notNull(),
  action: text("action").notNull(), // 'access', 'forbidden', etc.
  route: text("route").notNull(),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformAuditLog = typeof platformAuditLogs.$inferSelect;
export type InsertPlatformAuditLog = typeof platformAuditLogs.$inferInsert;
```

**Export from schema index:**
```typescript
// src/db/schema/index.ts - ADD:
export * from "./platform-audit-logs";
```

### Critical: Use `adminDb` for Platform Admin Queries

Platform admin operates OUTSIDE tenant context. Always use `adminDb` (not `db` or `getAuthenticatedDb`):

```typescript
import { adminDb } from "@/db";

// Correct - bypasses RLS
const tenants = await adminDb.query.tenants.findMany();

// WRONG - requires tenant context
const tenants = await db.query.tenants.findMany(); // Will fail!
```

### Platform Admin Helper Implementation

```typescript
// src/lib/platform-admin.ts
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { logPlatformAdminEvent } from "./platform-audit";

function getPlatformAdminEmails(): string[] {
  const emails = process.env.PLATFORM_ADMIN_EMAILS || "";
  return emails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isPlatformAdmin(email: string): boolean {
  return getPlatformAdminEmails().includes(email.toLowerCase());
}

export async function requirePlatformAdmin(): Promise<{
  clerkId: string;
  email: string;
  name: string;
}> {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const email = user.primaryEmailAddress?.emailAddress;

  if (!email || !isPlatformAdmin(email)) {
    // Log forbidden attempt
    logPlatformAdminEvent({
      adminEmail: email || "unknown",
      adminClerkId: user.id,
      action: "forbidden",
      route: "/platform-admin",
    });
    redirect("/platform-admin/forbidden");
  }

  const admin = {
    clerkId: user.id,
    email,
    name: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : email,
  };

  // Log successful access
  logPlatformAdminEvent({
    adminEmail: admin.email,
    adminClerkId: admin.clerkId,
    action: "access",
    route: "/platform-admin",
  });

  return admin;
}
```

### Platform Audit Logger Implementation

```typescript
// src/lib/platform-audit.ts
import { adminDb } from "@/db";
import { platformAuditLogs } from "@/db/schema/platform-audit-logs";

interface PlatformAuditEventParams {
  adminEmail: string;
  adminClerkId: string;
  action: string;
  route: string;
  metadata?: Record<string, unknown>;
}

export async function logPlatformAdminEvent(params: PlatformAuditEventParams): Promise<void> {
  try {
    await adminDb.insert(platformAuditLogs).values({
      admin_email: params.adminEmail,
      admin_clerk_id: params.adminClerkId,
      action: params.action,
      route: params.route,
      metadata: params.metadata,
    });
  } catch (error) {
    // Fire and forget - don't throw
    console.error("[PlatformAudit] Failed to log event:", error);
  }
}
```

### Platform Admin Layout

```typescript
// src/app/(platform-admin)/layout.tsx
import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-red-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">PLATFORM ADMIN</span>
          <span className="text-xs bg-red-700 px-2 py-1 rounded">Salina ERP</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">{admin.email}</span>
          <Link
            href="/dashboard"
            className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded"
          >
            Back to App
          </Link>
          <SignOutButton>
            <button className="text-xs bg-red-700 hover:bg-red-600 px-3 py-1 rounded">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

### Platform Admin Landing Page

```typescript
// src/app/(platform-admin)/platform-admin/page.tsx
import { requirePlatformAdmin } from "@/lib/platform-admin";

const upcomingFeatures = [
  { title: "Tenant Management", description: "View and search all tenants", story: "13.2-13.4" },
  { title: "Platform Analytics", description: "Platform-wide metrics and dashboards", story: "13.5" },
  { title: "User Impersonation", description: "Support customers by viewing their accounts", story: "13.6" },
  { title: "System Health", description: "Monitor database, jobs, and services", story: "13.7" },
  { title: "Announcements", description: "Broadcast messages to all tenants", story: "13.8" },
];

export default async function PlatformAdminPage() {
  const admin = await requirePlatformAdmin();

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">
        Welcome, {admin.name}
      </h1>
      <p className="text-slate-400 mb-8">Platform Administration Dashboard</p>

      <h2 className="text-xl font-semibold text-white mb-4">Coming Soon</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcomingFeatures.map((feature) => (
          <div
            key={feature.title}
            className="bg-slate-800 border border-slate-700 rounded-lg p-4"
          >
            <h3 className="text-white font-medium mb-1">{feature.title}</h3>
            <p className="text-slate-400 text-sm mb-2">{feature.description}</p>
            <span className="text-xs text-slate-500">Story {feature.story}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Environment Variables

```bash
# .env.example - ADD:

# Platform Administration
# Comma-separated list of emails with platform admin access
PLATFORM_ADMIN_EMAILS=admin@salina-erp.com

# Platform admin test user (for E2E tests)
TEST_PLATFORM_ADMIN_EMAIL=platform.admin@salina.media
TEST_PLATFORM_ADMIN_PASSWORD=Pl@tf0rm!Adm1n#9Xz
```

### Routing Structure

```
src/app/
├── (auth)/              # Sign-in/sign-up (public)
├── (dashboard)/         # Tenant-scoped routes (existing)
├── (portal)/            # Author portal (existing)
├── (public)/            # Marketing pages (existing)
└── (platform-admin)/    # Platform admin routes (NEW)
    ├── layout.tsx       # Auth check + header with sign-out
    ├── platform-admin/
    │   └── page.tsx     # Landing page with upcoming features
    └── forbidden/
        └── page.tsx     # 403 error page
```

### Test Location

Follow project conventions. Check existing test structure:
- If tests are in `src/__tests__/`, use `src/__tests__/lib/platform-admin.test.ts`
- If tests are colocated, use `src/lib/__tests__/platform-admin.test.ts`
- If tests are in root `__tests__/`, use `__tests__/lib/platform-admin.test.ts`

### Security Summary

1. **Clerk authentication required** - Must be logged in first
2. **Email whitelist in env vars** - Cannot be modified via application
3. **Separate audit trail** - All access logged to platform_audit_logs
4. **No tenant context** - Platform admin operates outside tenant boundaries
5. **Visual distinction** - Red header clearly identifies platform admin mode

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/platform-admin.ts` | Auth helpers |
| `src/lib/platform-audit.ts` | Platform audit logger |
| `src/db/schema/platform-audit-logs.ts` | Audit log table schema |
| `src/app/(platform-admin)/layout.tsx` | Layout with auth + header |
| `src/app/(platform-admin)/platform-admin/page.tsx` | Landing page |
| `src/app/(platform-admin)/forbidden/page.tsx` | 403 error page |
| `src/__tests__/lib/platform-admin.test.ts` | Unit tests |

### Files to Modify

| File | Change |
|------|--------|
| `src/proxy.ts` | Add platform-admin route handling |
| `src/db/schema/index.ts` | Export platform-audit-logs |
| `.env.example` | Add PLATFORM_ADMIN_EMAILS and test credentials |

### Dependencies

- **Epic 1**: Clerk authentication infrastructure
- **Drizzle Kit**: For migration generation

### What This Story Does NOT Include

- Tenant list/search (Story 13.2)
- Tenant detail view (Story 13.3)
- Tenant suspension (Story 13.4)
- Platform analytics (Story 13.5)
- Impersonation (Story 13.6)
- System health monitoring (Story 13.7)
- Platform announcements (Story 13.8)

### References

- [Source: docs/epics.md#Epic-13-Platform-Administration]
- [Source: src/proxy.ts] - Middleware to modify
- [Source: src/db/schema/audit-logs.ts] - Reference for audit pattern (DO NOT USE)
- [Source: src/lib/audit.ts] - Reference for fire-and-forget pattern
- [Source: src/db/index.ts] - adminDb usage pattern

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Implemented platform admin middleware in `src/proxy.ts` with early return before tenant lookup
- Created `platform_audit_logs` table via drizzle-kit generate/push
- Implemented `isPlatformAdmin()`, `requirePlatformAdmin()`, and `getCurrentPlatformAdmin()` helpers
- Created fire-and-forget `logPlatformAdminEvent()` audit logger using adminDb
- Built platform admin route group with layout, landing page, and 403 forbidden page
- Red/dark theme header distinguishes platform admin from tenant app
- Added 16 unit tests covering all acceptance criteria (7 isPlatformAdmin + 5 getCurrentPlatformAdmin + 4 audit logger)
- All new tests pass; no regressions introduced (pre-existing failures in statements-schema.test.ts are unrelated)

**Code Review Fixes Applied (2025-12-11):**
- M1: Removed duplicate `requirePlatformAdmin()` call from page.tsx (uses `getCurrentPlatformAdmin()` instead)
- M2: Added database indexes to `platform_audit_logs` (admin_email+created_at composite, action, created_at)
- M3: Fixed hardcoded route in audit logging - now dynamically retrieves current path from headers
- M4: Added 5 unit tests for `getCurrentPlatformAdmin()` function
- L1: Removed stale comment from test file
- L2: Added `PLATFORM_ADMIN_ACTIONS` constants for type-safe action strings
- L3: Changed "Back to App" link to "Exit Admin" pointing to `/` for platform-only admins

### File List

**Files Created:**
- `src/lib/platform-admin.ts` - Platform admin auth helpers
- `src/lib/platform-audit.ts` - Platform audit logger with action type constants
- `src/db/schema/platform-audit-logs.ts` - Audit log table schema with indexes
- `src/app/(platform-admin)/layout.tsx` - Platform admin layout with auth
- `src/app/(platform-admin)/platform-admin/page.tsx` - Landing page (uses getCurrentPlatformAdmin)
- `src/app/(platform-admin)/forbidden/page.tsx` - 403 error page
- `tests/unit/platform-admin.test.ts` - isPlatformAdmin + getCurrentPlatformAdmin tests (12 tests)
- `tests/unit/platform-audit.test.ts` - logPlatformAdminEvent unit tests (4 tests)
- `drizzle/migrations/0022_confused_next_avengers.sql` - Initial platform_audit_logs table
- `drizzle/migrations/0023_lush_warbound.sql` - Indexes for platform_audit_logs

**Files Modified:**
- `src/proxy.ts` - Added platform-admin route handling (lines 23-35)
- `src/db/schema/index.ts` - Export platform-audit-logs
- `.env.example` - Added PLATFORM_ADMIN_EMAILS and test credentials

## Change Log

- 2025-12-11: Implemented platform administrator authentication (Story 13.1)
- 2025-12-11: Code review fixes applied - indexes, tests, duplicate call removal, action constants
