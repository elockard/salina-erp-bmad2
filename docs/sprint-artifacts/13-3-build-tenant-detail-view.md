# Story 13.3: Build Tenant Detail View

Status: done

## Story

As a **platform administrator**,
I want to **view detailed information about a specific tenant**,
so that **I can understand their usage and support them effectively**.

## Acceptance Criteria

1. **Given** I am viewing a tenant in platform admin **When** I access the tenant detail page **Then** I see comprehensive tenant information

2. Basic info: name, subdomain, created date, status

3. Configuration: timezone, fiscal year, statement frequency

4. Users: list of all users with roles, status (Note: last login requires Clerk API - deferred)

5. Usage metrics:
   - Total contacts (formerly authors)
   - Total titles
   - Total sales transactions
   - Total royalty statements generated

6. Activity: recent activity log for the tenant

7. I can see when the tenant was last active

## Tasks / Subtasks

- [x] **Task 1: Add Platform Audit Action Constant** (AC: 6, 7)
  - [x] Edit `src/lib/platform-audit.ts`
  - [x] Add `VIEW_TENANT_DETAIL: "view_tenant_detail"` constant

- [x] **Task 2: Extend Types for Tenant Detail** (AC: 1-7)
  - [x] Edit `src/modules/platform-admin/types.ts`
  - [x] Add `TenantDetail` interface extending `TenantWithUserCount`
  - [x] Add `TenantUser` interface for user list
  - [x] Add `TenantUsageMetrics` interface
  - [x] Add `TenantActivityLog` interface

- [x] **Task 3: Create Tenant Detail Query** (AC: 1-5)
  - [x] Edit `src/modules/platform-admin/queries.ts`
  - [x] Implement `getTenantById(id: string)` - fetch single tenant with full details
  - [x] **CRITICAL:** Add UUID format validation before querying
  - [x] Use `adminDb` to bypass RLS
  - [x] Return null if tenant not found

- [x] **Task 4: Create Tenant Usage Metrics Query** (AC: 5)
  - [x] Edit `src/modules/platform-admin/queries.ts`
  - [x] Implement `getTenantUsageMetrics(tenantId: string)` - aggregate counts
  - [x] Query contacts, titles, sales, statements tables with `WHERE tenant_id = ?`
  - [x] Use `adminDb` with explicit tenant_id filter (NOT RLS)

- [x] **Task 5: Create Tenant Users Query** (AC: 4)
  - [x] Edit `src/modules/platform-admin/queries.ts`
  - [x] Implement `getTenantUsers(tenantId: string)` - fetch all users for tenant
  - [x] Return: id, email, role, is_active (from schema), created_at
  - [x] **NOTE:** Users table has NO `name` column - use email as identifier
  - [x] Use `is_active` boolean from schema for status (not hardcoded)

- [x] **Task 6: Create Tenant Activity Query** (AC: 6, 7)
  - [x] Edit `src/modules/platform-admin/queries.ts`
  - [x] Implement `getTenantActivity(tenantId: string, limit?: number)`
  - [x] Query `audit_logs` table with `WHERE tenant_id = ?`
  - [x] Order by `created_at DESC`, default limit 50
  - [x] Left join with users to get user email for display

- [x] **Task 7: Create Tenant Detail Server Action** (AC: 1-7)
  - [x] Edit `src/modules/platform-admin/actions.ts`
  - [x] Implement `getTenantDetail(id: string): Promise<ActionResult<TenantDetail>>`
  - [x] **CRITICAL:** Validate UUID format before any database queries
  - [x] Call `getCurrentPlatformAdmin()` for auth check
  - [x] Use `Promise.all()` for parallel data fetching
  - [x] Log `VIEW_TENANT_DETAIL` to platform audit trail

- [x] **Task 8: Create Tenant Detail Page** (AC: 1)
  - [x] Create `src/app/(platform-admin)/platform-admin/tenants/[id]/page.tsx`
  - [x] Server component that fetches tenant detail
  - [x] Use `generateMetadata` for dynamic title with tenant name
  - [x] Handle not found: call `notFound()`

- [x] **Task 9: Create Tenant Info Card Component** (AC: 2, 3, 7)
  - [x] Create `src/modules/platform-admin/components/tenant-info-card.tsx`
  - [x] Display: name, subdomain, status badge, created date
  - [x] Display: timezone, fiscal year start, statement frequency, royalty period type
  - [x] Display: last activity timestamp
  - [x] Include skeleton loading state

- [x] **Task 10: Create Tenant Users Table Component** (AC: 4)
  - [x] Create `src/modules/platform-admin/components/tenant-users-table.tsx`
  - [x] Display: email (primary identifier), role badge, status, created date
  - [x] **NOTE:** No name column in users schema - email is the identifier
  - [x] Use `is_active` for status badge (active/inactive)
  - [x] Include skeleton loading state and empty state

- [x] **Task 11: Create Tenant Metrics Cards Component** (AC: 5)
  - [x] Create `src/modules/platform-admin/components/tenant-metrics-cards.tsx`
  - [x] Display 4 metric cards: Contacts, Titles, Sales, Statements
  - [x] Include skeleton loading state

- [x] **Task 12: Create Tenant Activity Feed Component** (AC: 6)
  - [x] Create `src/modules/platform-admin/components/tenant-activity-feed.tsx`
  - [x] Display recent audit log entries with user email
  - [x] Group by date (Today, Yesterday, Earlier)
  - [x] Include skeleton loading state and empty state

- [x] **Task 13: Create Back Navigation** (AC: 1)
  - [x] Add "Back to Tenants" link at top of detail page
  - [x] Use ChevronLeft icon, navigate to `/platform-admin/tenants`

- [x] **Task 14: Write Unit Tests** (All ACs)
  - [x] Create `tests/unit/platform-admin-tenant-detail.test.ts`
  - [x] Test: `getTenantById()` returns tenant data / null
  - [x] Test: `getTenantById()` validates UUID format
  - [x] Test: `getTenantUsageMetrics()` returns correct counts
  - [x] Test: `getTenantUsers()` returns users with is_active status
  - [x] Test: `getTenantActivity()` returns audit logs, respects limit
  - [x] Test: `getTenantDetail()` returns ActionResult success/error
  - [x] Test: `getTenantDetail()` rejects invalid UUID format

## Dev Notes

### Critical: Schema Corrections

**Users table (`src/db/schema/users.ts`) has these columns:**
- `id`, `tenant_id`, `clerk_user_id`, `email`, `role`, `is_active`, `created_at`, `updated_at`
- **NO `name` column** - use email as primary identifier
- **NO `last_sign_in_at` column** - omit from display or fetch from Clerk API
- `is_active: boolean` - use for user status (not hardcoded "active")

### Critical: UUID Validation Required

Validate tenant ID format before database queries to prevent errors:

```typescript
// src/modules/platform-admin/queries.ts
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  if (!isValidUUID(id)) {
    return null;
  }
  const result = await adminDb.query.tenants.findFirst({
    where: eq(tenants.id, id),
  });
  return result ?? null;
}
```

### Critical: Use adminDb for All Queries

Platform admin operates OUTSIDE tenant context. Always use `adminDb`:

```typescript
import { adminDb } from "@/db";
import { tenants, users, contacts, titles, sales, statements, auditLogs } from "@/db/schema";
```

### Type Definitions

```typescript
// src/modules/platform-admin/types.ts - ADD:

export interface TenantUser {
  id: string;
  email: string;
  role: "owner" | "admin" | "editor" | "finance" | "author";
  is_active: boolean;
  created_at: Date;
}

export interface TenantUsageMetrics {
  contactCount: number;
  titleCount: number;
  salesCount: number;
  statementCount: number;
}

export interface TenantActivityLog {
  id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  user_email: string | null;
  created_at: Date;
}

export interface TenantDetail extends TenantWithUserCount {
  timezone: string;
  fiscal_year_start: string | null;
  statement_frequency: string;
  royalty_period_type: string;
  users: TenantUser[];
  metrics: TenantUsageMetrics;
  activity: TenantActivityLog[];
  last_activity_at: Date | null;
}
```

### Query Implementations

```typescript
// src/modules/platform-admin/queries.ts - ADD:

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  if (!isValidUUID(id)) return null;
  const result = await adminDb.query.tenants.findFirst({
    where: eq(tenants.id, id),
  });
  return result ?? null;
}

export async function getTenantUsageMetrics(tenantId: string): Promise<TenantUsageMetrics> {
  const [contactResult, titleResult, salesResult, statementResult] = await Promise.all([
    adminDb.select({ count: count() }).from(contacts).where(eq(contacts.tenant_id, tenantId)),
    adminDb.select({ count: count() }).from(titles).where(eq(titles.tenant_id, tenantId)),
    adminDb.select({ count: count() }).from(sales).where(eq(sales.tenant_id, tenantId)),
    adminDb.select({ count: count() }).from(statements).where(eq(statements.tenant_id, tenantId)),
  ]);
  return {
    contactCount: contactResult[0]?.count ?? 0,
    titleCount: titleResult[0]?.count ?? 0,
    salesCount: salesResult[0]?.count ?? 0,
    statementCount: statementResult[0]?.count ?? 0,
  };
}

export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
  return adminDb
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      is_active: users.is_active,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.tenant_id, tenantId))
    .orderBy(asc(users.email));
}

export async function getTenantActivity(tenantId: string, limit = 50): Promise<TenantActivityLog[]> {
  return adminDb
    .select({
      id: auditLogs.id,
      action_type: auditLogs.action_type,
      resource_type: auditLogs.resource_type,
      resource_id: auditLogs.resource_id,
      user_email: users.email,
      created_at: auditLogs.created_at,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.user_id, users.id))
    .where(eq(auditLogs.tenant_id, tenantId))
    .orderBy(desc(auditLogs.created_at))
    .limit(limit);
}
```

### Server Action with UUID Validation

```typescript
// src/modules/platform-admin/actions.ts - ADD:

export async function getTenantDetail(id: string): Promise<ActionResult<TenantDetail>> {
  try {
    // Validate UUID format first
    if (!isValidUUID(id)) {
      return { success: false, error: "Invalid tenant ID format" };
    }

    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized: Platform admin access required" };
    }

    const tenant = await getTenantById(id);
    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }

    // Log view event (fire and forget)
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.VIEW_TENANT_DETAIL,
      route: `/platform-admin/tenants/${id}`,
      metadata: { tenantId: id, tenantName: tenant.name },
    });

    // Fetch all data in parallel
    const [usersResult, metricsResult, activityResult] = await Promise.all([
      getTenantUsers(id),
      getTenantUsageMetrics(id),
      getTenantActivity(id),
    ]);

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: "active" as const,
        created_at: tenant.created_at,
        user_count: usersResult.length,
        timezone: tenant.timezone,
        fiscal_year_start: tenant.fiscal_year_start,
        statement_frequency: tenant.statement_frequency,
        royalty_period_type: tenant.royalty_period_type,
        users: usersResult,
        metrics: metricsResult,
        activity: activityResult,
        last_activity_at: activityResult[0]?.created_at ?? null,
      },
    };
  } catch (error) {
    console.error("getTenantDetail error:", error);
    return { success: false, error: "Failed to load tenant details" };
  }
}
```

### Page with Dynamic Metadata

```typescript
// src/app/(platform-admin)/platform-admin/tenants/[id]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTenantDetail } from "@/modules/platform-admin/actions";
import { TenantInfoCard } from "@/modules/platform-admin/components/tenant-info-card";
import { TenantUsersTable } from "@/modules/platform-admin/components/tenant-users-table";
import { TenantMetricsCards } from "@/modules/platform-admin/components/tenant-metrics-cards";
import { TenantActivityFeed } from "@/modules/platform-admin/components/tenant-activity-feed";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getTenantDetail(id);
  return {
    title: result.success
      ? `${result.data.name} | Platform Admin`
      : "Tenant Details | Platform Admin",
  };
}

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await getTenantDetail(id);

  if (!result.success) {
    notFound();
  }

  const tenant = result.data;

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/platform-admin/tenants"
        className="mb-6 inline-flex items-center text-sm text-slate-400 hover:text-white"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to Tenants
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
        <p className="text-slate-400">{tenant.subdomain}.salina-erp.com</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TenantInfoCard tenant={tenant} />
          <TenantUsersTable users={tenant.users} />
        </div>
        <div className="space-y-6">
          <TenantMetricsCards metrics={tenant.metrics} />
          <TenantActivityFeed activity={tenant.activity} />
        </div>
      </div>
    </div>
  );
}
```

### UI Component Pattern (with Skeleton)

```typescript
// Example: src/modules/platform-admin/components/tenant-metrics-cards.tsx
import { Users, BookOpen, DollarSign, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TenantUsageMetrics } from "../types";

interface Props {
  metrics: TenantUsageMetrics;
  isLoading?: boolean;
}

const metricConfig = [
  { key: "contactCount", label: "Contacts", icon: Users },
  { key: "titleCount", label: "Titles", icon: BookOpen },
  { key: "salesCount", label: "Sales", icon: DollarSign },
  { key: "statementCount", label: "Statements", icon: FileText },
] as const;

export function TenantMetricsCards({ metrics, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 bg-slate-700" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {metricConfig.map(({ key, label, icon: Icon }) => (
        <div key={key} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Icon className="h-4 w-4" />
            <span className="text-sm">{label}</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {metrics[key].toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Role Badge Colors

```typescript
const roleColors: Record<string, string> = {
  owner: "bg-purple-600 hover:bg-purple-700",
  admin: "bg-blue-600 hover:bg-blue-700",
  editor: "bg-green-600 hover:bg-green-700",
  finance: "bg-amber-600 hover:bg-amber-700",
  author: "bg-slate-600 hover:bg-slate-700",
};
```

### File Structure

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/app/(platform-admin)/platform-admin/tenants/[id]/page.tsx` | Detail page with dynamic metadata |
| `src/modules/platform-admin/components/tenant-info-card.tsx` | Basic info + config card |
| `src/modules/platform-admin/components/tenant-users-table.tsx` | Users table (email-based) |
| `src/modules/platform-admin/components/tenant-metrics-cards.tsx` | Usage metrics grid |
| `src/modules/platform-admin/components/tenant-activity-feed.tsx` | Activity log feed |
| `tests/unit/platform-admin-tenant-detail.test.ts` | Unit tests |

**Files to Modify:**
| File | Change |
|------|--------|
| `src/modules/platform-admin/types.ts` | Add TenantDetail, TenantUser, etc. |
| `src/modules/platform-admin/queries.ts` | Add queries with UUID validation |
| `src/modules/platform-admin/actions.ts` | Add getTenantDetail action |
| `src/lib/platform-audit.ts` | Add VIEW_TENANT_DETAIL constant |

### What This Story Does NOT Include

- Tenant suspension/reactivation controls (Story 13.4)
- User impersonation (Story 13.6)
- Edit tenant settings
- User management (invite/remove)
- Metrics caching (consider for future optimization)

### References

- [Source: docs/epics.md#Story-13.3]
- [Source: src/db/schema/users.ts] - **NO name column, has is_active**
- [Source: src/db/schema/tenants.ts]
- [Source: src/db/schema/audit-logs.ts]
- [Source: src/db/schema/contacts.ts]
- [Source: src/db/schema/titles.ts]
- [Source: src/db/schema/sales.ts]
- [Source: src/db/schema/statements.ts]
- [Source: src/modules/platform-admin/queries.ts] - adminDb pattern
- [Source: src/modules/platform-admin/components/tenant-list.tsx] - UI patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All 22 unit tests passing for tenant detail functionality
- All 75 platform-admin tests passing (no regressions)
- TypeScript check passing

### Completion Notes List

- Implemented VIEW_TENANT_DETAIL audit constant for platform admin activity logging
- Added TenantDetail, TenantUser, TenantUsageMetrics, TenantActivityLog types
- Implemented isValidUUID() for UUID format validation before DB queries
- Implemented getTenantById() with UUID validation
- Implemented getTenantUsageMetrics() counting contacts, titles, sales, statements
- Implemented getTenantUsers() returning users with is_active status (no name column in schema)
- Implemented getTenantActivity() with user email via left join, default limit 50
- Implemented getTenantDetail() server action with parallel data fetching and audit logging
- Created tenant detail page at /platform-admin/tenants/[id] with dynamic metadata
- Created TenantInfoCard component with basic info, config settings, last activity
- Created TenantUsersTable with email as primary identifier, role badges, is_active status
- Created TenantMetricsCards displaying 4 usage metrics with icons
- Created TenantActivityFeed grouped by date (Today/Yesterday/Earlier)
- Added back navigation with ChevronLeft icon
- Created 22 comprehensive unit tests covering all query and action functionality

### File List

**Files Created:**
- `src/app/(platform-admin)/platform-admin/tenants/[id]/page.tsx`
- `src/modules/platform-admin/components/tenant-info-card.tsx`
- `src/modules/platform-admin/components/tenant-users-table.tsx`
- `src/modules/platform-admin/components/tenant-metrics-cards.tsx`
- `src/modules/platform-admin/components/tenant-activity-feed.tsx`
- `tests/unit/platform-admin-tenant-detail.test.ts`

**Files Modified:**
- `src/lib/platform-audit.ts` - Added VIEW_TENANT_DETAIL constant
- `src/modules/platform-admin/types.ts` - Added TenantDetail, TenantUser, TenantUsageMetrics, TenantActivityLog interfaces
- `src/modules/platform-admin/queries.ts` - Added isValidUUID, getTenantById, getTenantUsageMetrics, getTenantUsers, getTenantActivity
- `src/modules/platform-admin/actions.ts` - Added getTenantDetail server action
- `docs/sprint-artifacts/sprint-status.yaml` - Updated story status
- `.env.example` - Added NEXT_PUBLIC_APP_DOMAIN

### Code Review Fixes Applied

**[M1] FIXED:** Removed unused `parseISO` import from tenant-activity-feed.tsx
**[M2] FIXED:** Updated AC-4 wording to note last login requires Clerk API (deferred)
**[M3] FIXED:** Added React `cache()` wrapper to prevent duplicate getTenantDetail calls
**[L1] FIXED:** Activity feed now shows specific dates (e.g., "Dec 10") instead of "Earlier"
**[L2] FIXED:** Added aria-labels and scope attributes for accessibility
**[L3] FIXED:** Domain now uses `NEXT_PUBLIC_APP_DOMAIN` env variable with fallback

## Quality Review Applied

**Reviewer:** Claude Opus 4.5 (Validation Agent)
**Date:** 2025-12-11

### Issues Fixed

1. **[CRITICAL] C1:** Removed references to non-existent `users.name` column - use email as identifier
2. **[CRITICAL] C2:** Corrected schema references, removed `user_name` from activity query
3. **[CRITICAL] C3:** Added UUID validation before database queries
4. **[ENHANCEMENT] E1:** Added skeleton loading state patterns to component specs
5. **[ENHANCEMENT] E2:** Added `generateMetadata` for dynamic page titles
6. **[ENHANCEMENT] E3:** Use `is_active` boolean from users schema instead of hardcoded status
7. **[ENHANCEMENT] E4:** Added note about potential metrics caching for future
8. **[OPTIMIZATION] L1:** Consolidated redundant code examples
9. **[OPTIMIZATION] L2:** Simplified type definitions section
