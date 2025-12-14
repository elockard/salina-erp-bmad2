# Story 13.5: Build Platform Analytics Dashboard

Status: done

## Quick Implementation Path

1. Add 6 type interfaces to `types.ts`
2. Create 5 query functions in `queries.ts` using `adminDb`
3. Create `health.ts` with 3 simple health check functions
4. Add 1 server action to `actions.ts` + 1 audit constant
5. Create 5 client components (stats card, 2 charts, health card, dashboard container)
6. Update `page.tsx` with dashboard, loading state, error boundary

---

## Story

As a **platform administrator**,
I want to **view platform-wide analytics and metrics**,
so that **I can understand business health and growth**.

## Acceptance Criteria

1. **Given** I am authenticated as platform admin **When** I access the platform dashboard **Then** I see key platform metrics

2. **Tenant metrics:**
   - Total tenants
   - Active tenants (any user activity in last 30 days)
   - New tenants this month
   - Suspended tenants count
   - Tenant growth trend chart (6 months)

3. **User metrics:**
   - Total users across all tenants
   - Active users (last 30 days)
   - Users by role distribution (pie/bar chart)

4. **Usage metrics:**
   - Total titles across platform
   - Total sales transactions this month
   - Total royalty statements generated this month

5. **System health:**
   - Database connection status with response time
   - Background job queue status (Inngest dashboard link)
   - Email delivery status (Resend dashboard link)

6. The dashboard refreshes automatically (60s interval) or on-demand via button

7. Dashboard access is logged to platform audit trail

**Prerequisites:** Story 13.4 (Tenant Suspension - DONE)

---

## Tasks / Subtasks

### Backend Tasks (Server-Side)

- [x] **Task 1: Add Platform Analytics Types** (AC: 1-5)
  - [x] Edit `src/modules/platform-admin/types.ts`
  - [x] Add `PlatformTenantMetrics` interface
  - [x] Add `TenantGrowthDataPoint` interface
  - [x] Add `PlatformUserMetrics` interface with role breakdown
  - [x] Add `PlatformUsageMetrics` interface
  - [x] Add `PlatformHealthStatus` interface
  - [x] Add `PlatformDashboardData` combining all metrics

- [x] **Task 2: Create Platform Analytics Queries** (AC: 1-5)
  - [x] Edit `src/modules/platform-admin/queries.ts`
  - [x] Add imports: `eq, gte, sql, count` from drizzle-orm
  - [x] Implement `getPlatformTenantMetrics()` - total, active, new, suspended
  - [x] Implement `getTenantGrowthTrend(months)` - monthly counts with parameterized SQL
  - [x] Implement `getPlatformUserMetrics()` - totals and role distribution
  - [x] Implement `getPlatformUsageMetrics()` - titles, sales, statements this month
  - [x] CRITICAL: Use `adminDb` to bypass RLS

- [x] **Task 3: Create Health Check Utilities** (AC: 5)
  - [x] Create `src/modules/platform-admin/health.ts`
  - [x] Implement `getDatabaseHealthStatus()` - SELECT 1 with timing
  - [x] Implement `getInngestHealthStatus()` - return dashboard URL
  - [x] Implement `getEmailServiceStatus()` - return Resend dashboard URL

- [x] **Task 4: Add Audit Constant and Server Action** (AC: 7)
  - [x] Edit `src/lib/platform-audit.ts` - add `VIEW_PLATFORM_DASHBOARD`
  - [x] Edit `src/modules/platform-admin/actions.ts`
  - [x] Implement `getPlatformDashboard()` - fetch all metrics in parallel, log audit event

### Frontend Tasks (Client-Side)

- [x] **Task 5: Create Dashboard UI Components** (AC: 1-6)
  - [x] Create `src/modules/platform-admin/components/platform-stats-card.tsx` - reusable stat card
  - [x] Create `src/modules/platform-admin/components/tenant-growth-chart.tsx` - Recharts line chart
  - [x] Create `src/modules/platform-admin/components/user-role-distribution.tsx` - Recharts pie chart
  - [x] Create `src/modules/platform-admin/components/system-health-card.tsx` - health indicators
  - [x] Create `src/modules/platform-admin/components/platform-dashboard.tsx` - main container with refresh

### Integration Tasks

- [x] **Task 6: Update Platform Admin Page** (AC: 1-7)
  - [x] Edit `src/app/(platform-admin)/platform-admin/page.tsx` - integrate dashboard
  - [x] Create `src/app/(platform-admin)/platform-admin/loading.tsx` - skeleton loader
  - [x] Create `src/app/(platform-admin)/platform-admin/error.tsx` - error boundary
  - [x] Move "Platform Analytics" from upcomingFeatures to activeFeatures

### Testing

- [x] **Task 7: Write Unit Tests** (All ACs)
  - [x] Create `tests/unit/platform-analytics.test.ts`
  - [x] Test all query functions with mocked data
  - [x] Test edge cases: 0 tenants, 0 users, division safety
  - [x] Test audit log creation on dashboard view

---

## Dev Notes

### Decision: "Active" Metrics Definition

For this story, "active" is defined as:
- **Active Tenant:** At least one user in the tenant has `users.updated_at` within last 30 days
- **Active User:** User record has `updated_at` within last 30 days

This is an approximation. True login tracking via Clerk's `last_sign_in_at` is deferred to Story 13.7 (System Health Monitoring).

### Critical: Database Access Pattern

**ALWAYS use `adminDb`** for platform admin queries (bypasses RLS):

```typescript
// src/modules/platform-admin/queries.ts
import { adminDb } from "@/db";
import { count, eq, gte, sql } from "drizzle-orm";
import { tenants, users, titles, sales, statements } from "@/db/schema";
```

### Type Definitions

```typescript
// src/modules/platform-admin/types.ts - ADD:

export interface PlatformTenantMetrics {
  total: number;
  activeLastThirtyDays: number;
  newThisMonth: number;
  suspended: number;
}

export interface TenantGrowthDataPoint {
  month: string; // "2025-01"
  count: number;
}

export interface PlatformUserMetrics {
  total: number;
  activeLastThirtyDays: number;
  byRole: {
    owner: number;
    admin: number;
    editor: number;
    finance: number;
    author: number;
  };
}

export interface PlatformUsageMetrics {
  totalTitles: number;
  salesThisMonth: number;
  statementsThisMonth: number;
}

export interface PlatformHealthStatus {
  database: { status: "healthy" | "degraded" | "error"; responseTimeMs: number };
  inngest: { status: "healthy" | "unknown"; dashboardUrl: string };
  email: { status: "healthy" | "unknown"; dashboardUrl: string };
}

export interface PlatformDashboardData {
  tenantMetrics: PlatformTenantMetrics;
  tenantGrowthTrend: TenantGrowthDataPoint[];
  userMetrics: PlatformUserMetrics;
  usageMetrics: PlatformUsageMetrics;
  health: PlatformHealthStatus;
  generatedAt: Date;
}
```

### Query Implementations

```typescript
// src/modules/platform-admin/queries.ts - ADD:

export async function getPlatformTenantMetrics(): Promise<PlatformTenantMetrics> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Count tenants with any user activity in last 30 days
  const activeTenantsSubquery = adminDb
    .selectDistinct({ tenant_id: users.tenant_id })
    .from(users)
    .where(gte(users.updated_at, thirtyDaysAgo));

  const [totalResult, activeResult, newResult, suspendedResult] = await Promise.all([
    adminDb.select({ count: count() }).from(tenants),
    adminDb.select({ count: count() }).from(activeTenantsSubquery.as("active")),
    adminDb.select({ count: count() }).from(tenants).where(gte(tenants.created_at, monthStart)),
    adminDb.select({ count: count() }).from(tenants).where(eq(tenants.status, "suspended")),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    activeLastThirtyDays: activeResult[0]?.count ?? 0,
    newThisMonth: newResult[0]?.count ?? 0,
    suspended: suspendedResult[0]?.count ?? 0,
  };
}

export async function getTenantGrowthTrend(months = 6): Promise<TenantGrowthDataPoint[]> {
  // SECURITY: Validate months to prevent SQL injection
  const safeMonths = Math.max(1, Math.min(24, Math.floor(months)));

  const result = await adminDb.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
      COUNT(*)::int as count
    FROM tenants
    WHERE created_at >= NOW() - INTERVAL '1 month' * ${safeMonths}
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month ASC
  `);

  return (result.rows as { month: string; count: number }[]).map((row) => ({
    month: row.month,
    count: row.count,
  }));
}

export async function getPlatformUserMetrics(): Promise<PlatformUserMetrics> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalResult, activeResult, roleResult] = await Promise.all([
    adminDb.select({ count: count() }).from(users),
    adminDb.select({ count: count() }).from(users).where(gte(users.updated_at, thirtyDaysAgo)),
    adminDb.select({ role: users.role, count: count() }).from(users).groupBy(users.role),
  ]);

  const byRole = { owner: 0, admin: 0, editor: 0, finance: 0, author: 0 };
  for (const row of roleResult) {
    if (row.role && row.role in byRole) {
      byRole[row.role as keyof typeof byRole] = row.count;
    }
  }

  return {
    total: totalResult[0]?.count ?? 0,
    activeLastThirtyDays: activeResult[0]?.count ?? 0,
    byRole,
  };
}

export async function getPlatformUsageMetrics(): Promise<PlatformUsageMetrics> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [titlesResult, salesResult, statementsResult] = await Promise.all([
    adminDb.select({ count: count() }).from(titles),
    adminDb.select({ count: count() }).from(sales).where(gte(sales.created_at, monthStart)),
    adminDb.select({ count: count() }).from(statements).where(gte(statements.created_at, monthStart)),
  ]);

  return {
    totalTitles: titlesResult[0]?.count ?? 0,
    salesThisMonth: salesResult[0]?.count ?? 0,
    statementsThisMonth: statementsResult[0]?.count ?? 0,
  };
}
```

### Health Check Implementation

```typescript
// src/modules/platform-admin/health.ts
import { adminDb } from "@/db";
import { sql } from "drizzle-orm";

export async function getDatabaseHealthStatus(): Promise<{
  status: "healthy" | "degraded" | "error";
  responseTimeMs: number;
}> {
  const start = Date.now();
  try {
    await adminDb.execute(sql`SELECT 1`);
    const responseTimeMs = Date.now() - start;
    return { status: responseTimeMs < 100 ? "healthy" : "degraded", responseTimeMs };
  } catch {
    return { status: "error", responseTimeMs: Date.now() - start };
  }
}

export function getInngestHealthStatus(): { status: "healthy" | "unknown"; dashboardUrl: string } {
  return {
    status: "unknown",
    dashboardUrl: process.env.INNGEST_DASHBOARD_URL ?? "https://app.inngest.com",
  };
}

export function getEmailServiceStatus(): { status: "healthy" | "unknown"; dashboardUrl: string } {
  return {
    status: "unknown",
    dashboardUrl: "https://resend.com/overview",
  };
}
```

### Server Action

```typescript
// src/modules/platform-admin/actions.ts - ADD:

import {
  getPlatformTenantMetrics,
  getTenantGrowthTrend,
  getPlatformUserMetrics,
  getPlatformUsageMetrics,
} from "./queries";
import {
  getDatabaseHealthStatus,
  getInngestHealthStatus,
  getEmailServiceStatus,
} from "./health";
import type { PlatformDashboardData } from "./types";

export async function getPlatformDashboard(): Promise<ActionResult<PlatformDashboardData>> {
  try {
    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized: Platform admin access required" };
    }

    // Log dashboard view (fire and forget)
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.VIEW_PLATFORM_DASHBOARD,
      route: "/platform-admin",
      metadata: {},
    });

    // Fetch all metrics in parallel
    const [tenantMetrics, tenantGrowthTrend, userMetrics, usageMetrics, dbHealth] =
      await Promise.all([
        getPlatformTenantMetrics(),
        getTenantGrowthTrend(6),
        getPlatformUserMetrics(),
        getPlatformUsageMetrics(),
        getDatabaseHealthStatus(),
      ]);

    return {
      success: true,
      data: {
        tenantMetrics,
        tenantGrowthTrend,
        userMetrics,
        usageMetrics,
        health: {
          database: dbHealth,
          inngest: getInngestHealthStatus(),
          email: getEmailServiceStatus(),
        },
        generatedAt: new Date(),
      },
    };
  } catch (error) {
    console.error("getPlatformDashboard error:", error);
    return { success: false, error: "Failed to load platform dashboard" };
  }
}
```

### Audit Constant

```typescript
// src/lib/platform-audit.ts - ADD to PLATFORM_ADMIN_ACTIONS:
VIEW_PLATFORM_DASHBOARD: "view_platform_dashboard",
```

### Client Components (use "use client" directive)

**Stats Card:**
```typescript
// src/modules/platform-admin/components/platform-stats-card.tsx
"use client";

import type { LucideIcon } from "lucide-react";

interface PlatformStatsCardProps {
  title: string;
  value: number;
  icon?: LucideIcon;
  variant?: "default" | "warning";
  compact?: boolean;
}

export function PlatformStatsCard({ title, value, icon: Icon, variant = "default", compact }: PlatformStatsCardProps) {
  return (
    <div className={`rounded-lg border border-slate-700 bg-slate-800 p-4 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`h-5 w-5 ${variant === "warning" ? "text-amber-400" : "text-blue-400"}`} />}
        <span className="text-sm text-slate-400">{title}</span>
      </div>
      <p className={`mt-1 font-bold text-white ${compact ? "text-xl" : "text-2xl"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
```

**Tenant Growth Chart (uses Recharts v3.5.1 - already installed):**
```typescript
// src/modules/platform-admin/components/tenant-growth-chart.tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TenantGrowthDataPoint } from "../types";

export function TenantGrowthChart({ data }: { data: TenantGrowthDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
        <h3 className="text-lg font-semibold text-white">Tenant Growth</h3>
        <p className="mt-4 text-slate-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <h3 className="mb-4 text-lg font-semibold text-white">Tenant Growth</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
              labelStyle={{ color: "#f1f5f9" }}
            />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**System Health Card:**
```typescript
// src/modules/platform-admin/components/system-health-card.tsx
"use client";

import { ExternalLink } from "lucide-react";
import type { PlatformHealthStatus } from "../types";

const statusColors = {
  healthy: "bg-green-500",
  degraded: "bg-amber-500",
  error: "bg-red-500",
  unknown: "bg-slate-500",
};

export function SystemHealthCard({ health }: { health: PlatformHealthStatus }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <h3 className="mb-4 text-lg font-semibold text-white">System Health</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Database</span>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusColors[health.database.status]}`} />
            <span className="text-sm text-slate-400">{health.database.responseTimeMs}ms</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Background Jobs</span>
          <a href={health.inngest.dashboardUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-400 hover:underline">
            Inngest <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Email Service</span>
          <a href={health.email.dashboardUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-400 hover:underline">
            Resend <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
```

**Main Dashboard Container with Auto-Refresh:**
```typescript
// src/modules/platform-admin/components/platform-dashboard.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformStatsCard } from "./platform-stats-card";
import { TenantGrowthChart } from "./tenant-growth-chart";
import { UserRoleDistribution } from "./user-role-distribution";
import { SystemHealthCard } from "./system-health-card";
import type { PlatformDashboardData } from "../types";

interface PlatformDashboardProps {
  initialData: PlatformDashboardData;
}

export function PlatformDashboard({ initialData }: PlatformDashboardProps) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => router.refresh());
    }, 60000);
    return () => clearInterval(interval);
  }, [router]);

  const handleManualRefresh = () => {
    startTransition(() => router.refresh());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Platform Analytics</h2>
        <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isPending}
          className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600">
          <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tenant Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PlatformStatsCard title="Total Tenants" value={data.tenantMetrics.total} icon={Building2} />
        <PlatformStatsCard title="Active (30d)" value={data.tenantMetrics.activeLastThirtyDays} icon={Users} />
        <PlatformStatsCard title="New This Month" value={data.tenantMetrics.newThisMonth} icon={TrendingUp} />
        <PlatformStatsCard title="Suspended" value={data.tenantMetrics.suspended} icon={AlertTriangle}
          variant={data.tenantMetrics.suspended > 0 ? "warning" : "default"} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TenantGrowthChart data={data.tenantGrowthTrend} />
        <UserRoleDistribution data={data.userMetrics.byRole} />
      </div>

      {/* Usage & Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Platform Usage</h3>
          <div className="grid grid-cols-3 gap-4">
            <PlatformStatsCard title="Total Titles" value={data.usageMetrics.totalTitles} compact />
            <PlatformStatsCard title="Sales (Month)" value={data.usageMetrics.salesThisMonth} compact />
            <PlatformStatsCard title="Statements (Month)" value={data.usageMetrics.statementsThisMonth} compact />
          </div>
        </div>
        <SystemHealthCard health={data.health} />
      </div>

      <p className="text-xs text-slate-500">
        Last updated: {new Date(data.generatedAt).toLocaleTimeString()} (auto-refreshes every 60s)
      </p>
    </div>
  );
}
```

### Loading and Error States

```typescript
// src/app/(platform-admin)/platform-admin/loading.tsx
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="mb-8 h-8 w-48 rounded bg-slate-700" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-slate-800" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-lg bg-slate-800" />
        <div className="h-72 rounded-lg bg-slate-800" />
      </div>
    </div>
  );
}
```

```typescript
// src/app/(platform-admin)/platform-admin/error.tsx
"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl text-center">
      <h2 className="text-xl font-bold text-white">Failed to load dashboard</h2>
      <p className="mt-2 text-slate-400">{error.message}</p>
      <Button onClick={reset} className="mt-4">Try Again</Button>
    </div>
  );
}
```

### Project Structure Notes

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/modules/platform-admin/health.ts` | Health check utilities |
| `src/modules/platform-admin/components/platform-stats-card.tsx` | Reusable stat card |
| `src/modules/platform-admin/components/tenant-growth-chart.tsx` | Line chart (Recharts) |
| `src/modules/platform-admin/components/user-role-distribution.tsx` | Role pie chart |
| `src/modules/platform-admin/components/system-health-card.tsx` | Health status |
| `src/modules/platform-admin/components/platform-dashboard.tsx` | Main dashboard |
| `src/app/(platform-admin)/platform-admin/loading.tsx` | Loading skeleton |
| `src/app/(platform-admin)/platform-admin/error.tsx` | Error boundary |
| `tests/unit/platform-analytics.test.ts` | Unit tests |

**Files to Modify:**
| File | Change |
|------|--------|
| `src/modules/platform-admin/types.ts` | Add 6 analytics types |
| `src/modules/platform-admin/queries.ts` | Add 4 metrics queries |
| `src/modules/platform-admin/actions.ts` | Add getPlatformDashboard action |
| `src/lib/platform-audit.ts` | Add VIEW_PLATFORM_DASHBOARD constant |
| `src/app/(platform-admin)/platform-admin/page.tsx` | Integrate dashboard |

### Dependencies

**Recharts v3.5.1** is already installed - no action needed.

### Testing Approach

```typescript
// tests/unit/platform-analytics.test.ts
describe("Platform Analytics", () => {
  describe("getPlatformTenantMetrics", () => {
    it("returns correct counts including suspended");
    it("correctly identifies active tenants from user activity");
    it("handles 0 tenants gracefully");
  });

  describe("getTenantGrowthTrend", () => {
    it("validates months parameter (1-24 range)");
    it("returns monthly data points in ascending order");
    it("handles empty result set");
  });

  describe("getPlatformUserMetrics", () => {
    it("returns correct role distribution");
    it("handles missing roles in result");
  });

  describe("getPlatformDashboard", () => {
    it("requires platform admin authentication");
    it("logs VIEW_PLATFORM_DASHBOARD to audit");
    it("returns all metrics combined");
  });
});
```

### References

- [Source: docs/epics.md#Story-13.5]
- [Source: docs/architecture.md#Project-Structure]
- [Source: src/modules/platform-admin/queries.ts] - Existing query patterns
- [Source: src/modules/platform-admin/actions.ts] - Existing action patterns
- [Source: src/modules/platform-admin/types.ts] - Existing type patterns
- [Source: src/lib/platform-audit.ts] - Audit logging
- [Source: src/db/schema/tenants.ts] - Tenant schema with status
- [Source: src/db/schema/users.ts] - User schema with roles

---

## Dev Agent Record

### Context Reference

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Implemented 6 type interfaces for platform analytics (PlatformTenantMetrics, TenantGrowthDataPoint, PlatformUserMetrics, PlatformUsageMetrics, PlatformHealthStatus, PlatformDashboardData)
- Created 4 analytics query functions using adminDb to bypass RLS
- Implemented health check utilities for database, Inngest, and Resend
- Added VIEW_PLATFORM_DASHBOARD audit constant and getPlatformDashboard server action
- Created 5 client components: stats card, tenant growth chart, user role distribution pie chart, system health card, and main dashboard container
- Dashboard includes 60-second auto-refresh and manual refresh button
- Updated platform admin page to integrate analytics dashboard
- Added loading skeleton and error boundary for dashboard
- Wrote 25 unit tests covering all query functions, dashboard action, serialization, and edge cases
- All 142 platform admin tests pass
- TypeScript check passes
- Lint check passes for new files

### Code Review Fixes Applied

- **H1 Fixed**: Changed `generatedAt` from `Date` to ISO string for safe client serialization
- **H2 Fixed**: Added tests for serialization safety and parameter validation
- **M1 Fixed**: Added documentation clarifying "active" tenant metric definition (user.updated_at proxy)
- **M2 Fixed**: Added comment confirming loading.tsx works correctly with RSC streaming
- **M3 Fixed**: Improved health check documentation and UI labels for external dashboards
- **L1 Fixed**: Added explicit locale to toLocaleTimeString for consistent formatting

### File List

**Created:**
- src/modules/platform-admin/health.ts
- src/modules/platform-admin/components/platform-stats-card.tsx
- src/modules/platform-admin/components/tenant-growth-chart.tsx
- src/modules/platform-admin/components/user-role-distribution.tsx
- src/modules/platform-admin/components/system-health-card.tsx
- src/modules/platform-admin/components/platform-dashboard.tsx
- src/app/(platform-admin)/platform-admin/loading.tsx
- src/app/(platform-admin)/platform-admin/error.tsx
- tests/unit/platform-analytics.test.ts

**Modified:**
- src/modules/platform-admin/types.ts
- src/modules/platform-admin/queries.ts
- src/modules/platform-admin/actions.ts
- src/lib/platform-audit.ts
- src/app/(platform-admin)/platform-admin/page.tsx
- docs/sprint-artifacts/sprint-status.yaml
