# Story 13.2: Build Tenant List and Search Interface

Status: done

## Story

As a **platform administrator**,
I want to **view and search all tenants on the platform**,
so that **I can manage and support customers effectively**.

## Acceptance Criteria

1. **Given** I am authenticated as platform admin **When** I access the tenant management page **Then** I see a list of all tenants on the platform

2. The list shows: tenant name, subdomain, status, created date, user count

3. I can search tenants by name or subdomain

4. I can filter by status (active, suspended)

5. I can sort by name, created date, or user count

6. The list is paginated for performance

7. I can click a tenant to view detailed information (navigation to Story 13.3)

## Tasks / Subtasks

- [x] **Task 1: Add Platform Audit Action Constants** (AC: 1)
  - [x] Edit `src/lib/platform-audit.ts`
  - [x] Add `TENANT_LIST: "tenant_list"` constant
  - [x] Add `TENANT_SEARCH: "tenant_search"` constant

- [x] **Task 2: Create Platform Admin Tenant Queries** (AC: 1, 2, 6)
  - [x] Create `src/modules/platform-admin/queries.ts`
  - [x] Implement `getTenants()` - fetch all tenants with user counts
  - [x] Use `adminDb` to bypass RLS (platform admin operates outside tenant context)
  - [x] Return data: id, name, subdomain, status, created_at, user_count
  - [x] Implement server-side pagination (default 25 per page)
  - [x] Default status to 'active' until Story 13.4 adds status column

- [x] **Task 3: Create Tenant Search and Filter Action** (AC: 3, 4, 5)
  - [x] Create `src/modules/platform-admin/actions.ts`
  - [x] Implement `searchTenants()` server action returning `ActionResult<PaginatedTenantsResult>`
  - [x] Parameters: search, status, sortBy, sortOrder, page, pageSize
  - [x] Log platform admin search events to audit trail
  - [x] Return `{ success: false, error: "..." }` on failure (not throw)

- [x] **Task 4: Create Tenant List Component** (AC: 1, 2, 3, 4, 5, 7)
  - [x] Create `src/modules/platform-admin/components/tenant-list.tsx`
  - [x] Client component with search input (debounced 300ms)
  - [x] Status filter dropdown: All, Active, Suspended
  - [x] Sort dropdown: Name, Created Date, User Count
  - [x] Sort order toggle button (asc/desc)
  - [x] Display tenant rows with name, subdomain, status badge, date, user count
  - [x] Clickable rows navigate to `/platform-admin/tenants/[id]`
  - [x] Loading skeleton during fetch
  - [x] Empty state with icon when no results
  - [x] Toast notification on search errors
  - [x] URL state persistence for search/filter/page

- [x] **Task 5: Create Pagination Component** (AC: 6)
  - [x] Create `src/modules/platform-admin/components/tenant-pagination.tsx`
  - [x] Display: "Showing X-Y of Z tenants"
  - [x] Previous/Next buttons with disabled states
  - [x] Page number display
  - [x] Items per page selector: 10, 25, 50, 100

- [x] **Task 6: Create Tenant Management Page** (AC: 1)
  - [x] Create `src/app/(platform-admin)/platform-admin/tenants/page.tsx`
  - [x] Server component that fetches initial tenant list
  - [x] Pass data to TenantList client component
  - [x] Page title: "Tenant Management"

- [x] **Task 7: Update Platform Admin Navigation** (AC: 7)
  - [x] Edit `src/app/(platform-admin)/platform-admin/page.tsx`
  - [x] Change "Tenant Management" card to link to `/platform-admin/tenants`

- [x] **Task 8: Write Tests** (All ACs)
  - [x] Unit: `getTenants()` returns tenant data with user counts
  - [x] Unit: `searchTenants()` filters by name (case-insensitive)
  - [x] Unit: `searchTenants()` filters by subdomain
  - [x] Unit: `searchTenants()` filters by status
  - [x] Unit: `searchTenants()` sorts by name/created_at/user_count
  - [x] Unit: `searchTenants()` paginates correctly
  - [x] Unit: `searchTenants()` returns ActionResult with success/error
  - [x] Unit: Returns empty array when no matches
  - [x] Unit: Unauthorized user returns error (not throws)

## Dev Notes

### Critical: DO NOT Do These Things

- **DO NOT** use `db` or `getDb()` - platform admin has no tenant context
- **DO NOT** throw errors in server actions - return `ActionResult<T>` pattern
- **DO NOT** hardcode page sizes in components - use state/props
- **DO NOT** skip the `getCurrentPlatformAdmin()` auth check in actions
- **DO NOT** use `getAuthenticatedDb()` - it requires tenant JWT

### Critical: Use adminDb for All Queries

```typescript
// src/modules/platform-admin/queries.ts
import { adminDb } from "@/db";
import { tenants, users } from "@/db/schema";
import { and, count, eq, sql, desc, asc, ilike, or } from "drizzle-orm";

// CORRECT - bypasses RLS
const result = await adminDb.select().from(tenants);

// WRONG - will fail without tenant context
const result = await db.select().from(tenants);
```

### Add Audit Action Constants

```typescript
// src/lib/platform-audit.ts - ADD these constants:
export const PLATFORM_ADMIN_ACTIONS = {
  ACCESS: "access",
  FORBIDDEN: "forbidden",
  VIEW_TENANT: "view_tenant",
  SUSPEND_TENANT: "suspend_tenant",
  REACTIVATE_TENANT: "reactivate_tenant",
  VIEW_ANALYTICS: "view_analytics",
  START_IMPERSONATION: "start_impersonation",
  END_IMPERSONATION: "end_impersonation",
  TENANT_LIST: "tenant_list",      // ADD
  TENANT_SEARCH: "tenant_search",  // ADD
} as const;
```

### Type Definitions

```typescript
// src/modules/platform-admin/types.ts
export interface TenantWithUserCount {
  id: string;
  name: string;
  subdomain: string;
  status: "active" | "suspended";
  created_at: Date;
  user_count: number;
}

export interface GetTenantsOptions {
  search?: string;
  status?: "active" | "suspended" | "all";
  sortBy?: "name" | "created_at" | "user_count";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PaginatedTenantsResult {
  tenants: TenantWithUserCount[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### Query Implementation

```typescript
// src/modules/platform-admin/queries.ts
import { adminDb } from "@/db";
import { tenants, users } from "@/db/schema";
import { and, count, eq, sql, desc, asc, ilike, or } from "drizzle-orm";
import type { GetTenantsOptions, PaginatedTenantsResult, TenantWithUserCount } from "./types";

export async function getTenants(options: GetTenantsOptions = {}): Promise<PaginatedTenantsResult> {
  const {
    search,
    status = "all",
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    pageSize = 25,
  } = options;

  // User count subquery
  const userCountSubquery = adminDb
    .select({
      tenant_id: users.tenant_id,
      user_count: count(users.id).as("user_count"),
    })
    .from(users)
    .groupBy(users.tenant_id)
    .as("user_counts");

  // Build where conditions
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(tenants.name, `%${search}%`),
        ilike(tenants.subdomain, `%${search}%`)
      )
    );
  }
  // Status filter ready for Story 13.4 when column exists
  // if (status !== "all") {
  //   conditions.push(eq(tenants.status, status));
  // }

  // Sort configuration
  const sortColumn = sortBy === "name" ? tenants.name
    : sortBy === "created_at" ? tenants.created_at
    : sql`COALESCE(user_counts.user_count, 0)`;
  const orderFn = sortOrder === "desc" ? desc : asc;

  // Execute paginated query
  const offset = (page - 1) * pageSize;
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await adminDb
    .select({
      id: tenants.id,
      name: tenants.name,
      subdomain: tenants.subdomain,
      created_at: tenants.created_at,
      user_count: sql<number>`COALESCE(user_counts.user_count, 0)`,
    })
    .from(tenants)
    .leftJoin(userCountSubquery, eq(tenants.id, userCountSubquery.tenant_id))
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(pageSize)
    .offset(offset);

  // Get total count
  const [{ total }] = await adminDb
    .select({ total: count() })
    .from(tenants)
    .where(whereClause);

  return {
    tenants: result.map(t => ({ ...t, status: "active" as const })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

### Server Action with ActionResult Pattern

```typescript
// src/modules/platform-admin/actions.ts
"use server";

import { getCurrentPlatformAdmin } from "@/lib/platform-admin";
import { logPlatformAdminEvent, PLATFORM_ADMIN_ACTIONS } from "@/lib/platform-audit";
import type { ActionResult } from "@/lib/types";
import { getTenants } from "./queries";
import type { GetTenantsOptions, PaginatedTenantsResult } from "./types";

export async function searchTenants(
  options: GetTenantsOptions
): Promise<ActionResult<PaginatedTenantsResult>> {
  try {
    const admin = await getCurrentPlatformAdmin();

    if (!admin) {
      return { success: false, error: "Unauthorized: Platform admin access required" };
    }

    // Log search event (fire and forget)
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.TENANT_SEARCH,
      route: "/platform-admin/tenants",
      metadata: { search: options.search, status: options.status },
    });

    const result = await getTenants(options);
    return { success: true, data: result };
  } catch (error) {
    console.error("searchTenants error:", error);
    return { success: false, error: "Failed to search tenants" };
  }
}
```

### UI Component with Toast & URL State

```typescript
// src/modules/platform-admin/components/tenant-list.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowUpDown, Building2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchTenants } from "../actions";
import type { PaginatedTenantsResult } from "../types";
import { TenantPagination } from "./tenant-pagination";

interface TenantListProps {
  initialData: PaginatedTenantsResult;
}

export function TenantList({ initialData }: TenantListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState<"all" | "active" | "suspended">(
    (searchParams.get("status") as "all" | "active" | "suspended") || "all"
  );
  const [sortBy, setSortBy] = useState<"name" | "created_at" | "user_count">(
    (searchParams.get("sort") as "name" | "created_at" | "user_count") || "name"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (searchParams.get("order") as "asc" | "desc") || "asc"
  );
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get("size")) || 25);
  const [loading, setLoading] = useState(false);

  // Update URL when filters change
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);
    if (sortBy !== "name") params.set("sort", sortBy);
    if (sortOrder !== "asc") params.set("order", sortOrder);
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 25) params.set("size", String(pageSize));
    router.replace(`/platform-admin/tenants?${params.toString()}`, { scroll: false });
  }, [search, status, sortBy, sortOrder, page, pageSize, router]);

  // Fetch tenants
  const fetchTenants = useCallback(async () => {
    setLoading(true);
    const result = await searchTenants({ search: search || undefined, status, sortBy, sortOrder, page, pageSize });

    if (result.success) {
      setData(result.data);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, [search, status, sortBy, sortOrder, page, pageSize]);

  // Debounced search & URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenants();
      updateUrl();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTenants, updateUrl]);

  const toggleSortOrder = () => setSortOrder(prev => prev === "asc" ? "desc" : "asc");

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or subdomain..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <Select value={status} onValueChange={(v: typeof status) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v: typeof sortBy) => { setSortBy(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="created_at">Created Date</SelectItem>
            <SelectItem value="user_count">User Count</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={toggleSortOrder} className="border-slate-700">
          <ArrowUpDown className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-700 bg-slate-800 overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr className="text-left text-sm text-slate-400">
              <th className="p-4 font-medium">Tenant</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Created</th>
              <th className="p-4 font-medium">Users</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700">
                  <td className="p-4"><Skeleton className="h-10 w-48 bg-slate-700" /></td>
                  <td className="p-4"><Skeleton className="h-6 w-16 bg-slate-700" /></td>
                  <td className="p-4"><Skeleton className="h-6 w-24 bg-slate-700" /></td>
                  <td className="p-4"><Skeleton className="h-6 w-16 bg-slate-700" /></td>
                </tr>
              ))
            ) : data.tenants.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400 font-medium">No tenants found</p>
                  <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
                </td>
              </tr>
            ) : (
              data.tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
                >
                  <td className="p-4">
                    <Link href={`/platform-admin/tenants/${tenant.id}`} className="block group">
                      <div className="font-medium text-white group-hover:text-blue-400">{tenant.name}</div>
                      <div className="text-sm text-slate-400">{tenant.subdomain}.salina-erp.com</div>
                    </Link>
                  </td>
                  <td className="p-4">
                    <Badge className={tenant.status === "active" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
                      {tenant.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-slate-300">
                    {format(new Date(tenant.created_at), "MMM dd, yyyy")}
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className="bg-slate-700">{tenant.user_count} users</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <TenantPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </div>
  );
}
```

### Pagination Component

```typescript
// src/modules/platform-admin/components/tenant-pagination.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TenantPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function TenantPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: TenantPaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between text-sm text-slate-400">
      <div>
        Showing {start}-{end} of {total} tenants
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span>Rows:</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="w-[70px] h-8 bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-slate-700"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">Page {page} of {totalPages}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-slate-700"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Page Component

```typescript
// src/app/(platform-admin)/platform-admin/tenants/page.tsx
import { getTenants } from "@/modules/platform-admin/queries";
import { TenantList } from "@/modules/platform-admin/components/tenant-list";

export const metadata = {
  title: "Tenant Management | Platform Admin",
  description: "View and manage all tenants on the platform",
};

export default async function TenantsPage() {
  const initialData = await getTenants();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Tenant Management</h1>
        <p className="text-slate-400">View and manage all tenants on the platform</p>
      </div>
      <TenantList initialData={initialData} />
    </div>
  );
}
```

### Project Structure

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/modules/platform-admin/types.ts` | TypeScript type definitions |
| `src/modules/platform-admin/queries.ts` | Database queries using adminDb |
| `src/modules/platform-admin/actions.ts` | Server actions with ActionResult |
| `src/modules/platform-admin/components/tenant-list.tsx` | Main list component |
| `src/modules/platform-admin/components/tenant-pagination.tsx` | Pagination controls |
| `src/app/(platform-admin)/platform-admin/tenants/page.tsx` | Tenant management page |
| `tests/unit/platform-admin-queries.test.ts` | Unit tests |

**Files to Modify:**
| File | Change |
|------|--------|
| `src/lib/platform-audit.ts` | Add TENANT_LIST and TENANT_SEARCH constants |
| `src/app/(platform-admin)/platform-admin/page.tsx` | Link Tenant Management card to /platform-admin/tenants |

### Database Index Recommendation

For better search performance at scale, consider adding indexes:

```sql
CREATE INDEX idx_tenants_name ON tenants (name);
CREATE INDEX idx_tenants_subdomain ON tenants (subdomain);
CREATE INDEX idx_tenants_created_at ON tenants (created_at);
```

### Dependencies

- **Story 13.1**: Platform admin authentication (COMPLETED)
- **Story 13.3**: Tenant detail view (link destination - can be placeholder initially)

### What This Story Does NOT Include

- Tenant detail view (Story 13.3)
- Tenant suspension/reactivation (Story 13.4)
- Adding `status` column to tenants table (Story 13.4)
- Platform analytics (Story 13.5)

### References

- [Source: docs/epics.md#Story-13.2] - Story requirements
- [Source: src/db/schema/tenants.ts] - Tenant table schema
- [Source: src/db/schema/users.ts] - Users table for user count
- [Source: src/db/index.ts:21] - adminDb export
- [Source: src/lib/platform-admin.ts] - getCurrentPlatformAdmin()
- [Source: src/lib/platform-audit.ts] - PLATFORM_ADMIN_ACTIONS constants
- [Source: src/lib/types.ts] - ActionResult<T> type
- [Source: src/modules/users/actions.ts] - ActionResult pattern reference
- [Source: src/modules/contacts/components/contacts-split-view.tsx] - UI pattern reference

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Implemented platform admin tenant management feature with search, filter, sort, and pagination
- Created types, queries, actions, and UI components following project patterns
- Used `adminDb` to bypass RLS for platform-level queries
- Implemented `ActionResult<T>` pattern for server actions (no throwing errors)
- Added audit logging for tenant list and search events
- 36 unit tests pass covering search, filter, sort, pagination, and auth
- Lint passes (no errors)
- Pre-existing test failures (10) are unrelated to this story (statements schema)

### File List

**New Files:**
- `src/modules/platform-admin/types.ts` - TypeScript type definitions
- `src/modules/platform-admin/queries.ts` - getTenants() query using adminDb
- `src/modules/platform-admin/actions.ts` - searchTenants() server action
- `src/modules/platform-admin/components/tenant-list.tsx` - Main list component
- `src/modules/platform-admin/components/tenant-pagination.tsx` - Pagination controls
- `src/app/(platform-admin)/platform-admin/tenants/page.tsx` - Tenant management page
- `tests/unit/platform-admin-queries.test.ts` - Query/action unit tests (20 tests)
- `tests/unit/platform-admin-actions.test.ts` - Action unit tests (16 tests)

**Modified Files:**
- `src/lib/platform-audit.ts` - Added TENANT_LIST and TENANT_SEARCH constants
- `src/app/(platform-admin)/platform-admin/page.tsx` - Added active feature link to tenants page

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.5 (Code Review Agent)
**Date:** 2025-12-11

### Review Summary

**Outcome:** ✅ APPROVED (with fixes applied)

**Issues Found:** 1 High, 3 Medium, 2 Low
**Issues Fixed:** All HIGH and MEDIUM issues resolved

### Issues Fixed During Review

1. **[HIGH] Input Validation for page/pageSize** (`queries.ts:36-38`)
   - Added validation to sanitize pagination inputs
   - `page` now clamped to minimum 1
   - `pageSize` now clamped between 1-100

2. **[MEDIUM] URL State Manipulation** (`tenant-list.tsx:53-76`)
   - Added proper validation for URL params
   - Invalid values now fall back to safe defaults
   - pageSize restricted to allowed values [10, 25, 50, 100]

3. **[MEDIUM] Misleading Status Filter UI** (`tenant-list.tsx:140-160`)
   - Disabled status filter until Story 13.4 adds status column
   - Added tooltip explaining "Status filtering coming in Story 13.4"

4. **[MEDIUM] Missing Edge Case Tests** (`platform-admin-queries.test.ts:411-494`)
   - Added 5 new tests for pagination edge cases
   - Tests cover page=0, negative page, pageSize=0, negative pageSize, large page numbers

5. **[LOW] Hardcoded Domain** (`tenant-list.tsx:243`)
   - Added TODO comment for future extraction to env config

### Test Results After Fixes

- **Query Tests:** 25 passed (was 20)
- **Action Tests:** 16 passed
- **Total:** 41 tests passing
- **Lint:** No errors

### AC Verification

| AC | Status | Evidence |
|----|--------|----------|
| AC1: See list of tenants when authenticated | ✅ | `tenants/page.tsx` with `requirePlatformAdmin()` |
| AC2: List shows name, subdomain, status, date, user count | ✅ | `tenant-list.tsx:228-254` |
| AC3: Search by name or subdomain | ✅ | `queries.ts:49-56` with ilike |
| AC4: Filter by status | ⏳ | UI present but disabled (Story 13.4) |
| AC5: Sort by name, date, user count | ✅ | `queries.ts:65-72` |
| AC6: Paginated list | ✅ | `queries.ts:75-92`, `tenant-pagination.tsx` |
| AC7: Click to navigate to detail | ✅ | Link to `/platform-admin/tenants/[id]` (404 until 13.3) |

### Security Assessment

- ✅ Uses `adminDb` correctly for platform-level access
- ✅ Auth check via `getCurrentPlatformAdmin()` on all actions
- ✅ ActionResult pattern - no throwing errors to client
- ✅ Audit logging for all tenant list/search events
- ✅ Input validation added for pagination parameters
- ✅ Drizzle ORM handles parameterization (no SQL injection)

### Notes

- Status filter correctly deferred to Story 13.4 when status column is added
- Tenant detail navigation (AC7) will 404 until Story 13.3 - acceptable per story scope
- Pre-existing test failures (10) unrelated to this story (statements schema)
