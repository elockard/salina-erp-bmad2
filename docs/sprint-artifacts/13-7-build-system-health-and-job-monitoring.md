# Story 13.7: Build System Health and Job Monitoring

Status: Ready for Review

## Quick Implementation Path

1. Add system monitoring types to `src/modules/platform-admin/types.ts` (DatabaseMetrics, InngestJobMetrics, EmailMetrics, SystemHealthData) - see Dev Notes for exact interfaces
2. **REPLACE** existing `getDatabaseHealthStatus()` in `src/modules/platform-admin/health.ts` with new `getDatabaseMetrics()` function (connection pool, db size)
3. Create `src/modules/platform-admin/job-monitoring.ts` for Inngest fallback (follows Story 6.6 pattern - returns "unknown" status with dashboard link)
4. Create `src/modules/platform-admin/email-monitoring.ts` for Resend API integration
5. Add server action `getSystemHealth()` to `src/modules/platform-admin/actions.ts` (separate from existing `getPlatformDashboard()`)
6. Create `src/app/(platform-admin)/platform-admin/system/page.tsx` route
7. Build `SystemHealthPage` component with database, jobs, email, and alerts sections
8. Create `DatabaseHealthCard`, `InngestJobsCard`, `EmailDeliveryCard`, `AlertsSection` components
9. Add alert acknowledgment action and state management
10. Update platform admin landing page navigation (move System Health to Quick Access)
11. Write comprehensive unit tests

**IMPORTANT:** This story creates a NEW separate `/platform-admin/system` page. The existing platform dashboard at `/platform-admin` remains unchanged and continues using `getPlatformDashboard()` with `PlatformHealthStatus`.

---

## Story

As a **platform administrator**,
I want to **monitor system health and background job status**,
So that **I can ensure the platform is operating correctly**.

## Acceptance Criteria

1. **Given** I am authenticated as platform admin **When** I access the system monitoring page **Then** I see current system status

2. **Database status displayed:**
   - Connection pool health
   - Recent slow queries (if available)
   - Database size

3. **Background jobs (Inngest) status displayed:**
   - Queue depth
   - Recent job failures with errors
   - Job success rate
   - Link to Inngest dashboard

4. **Application health displayed:**
   - Memory usage (if available)
   - Recent application errors
   - API response times (if tracked)

5. **Email delivery status displayed:**
   - Recent sends
   - Delivery failures
   - Resend dashboard link

6. I can acknowledge/dismiss alerts

**Prerequisites:** Story 13.5 (Platform Analytics Dashboard - DONE)

---

## Tasks / Subtasks

### Backend Tasks (Server-Side)

- [x] **Task 1: Add System Monitoring Types** (AC: 1-5)
  - [x] Edit `src/modules/platform-admin/types.ts`
  - [x] NOTE: These are NEW types separate from existing `PlatformHealthStatus` (used by dashboard)
  - [x] Add `DatabaseMetrics` interface:
    - connectionPoolStatus: "healthy" | "degraded" | "error"
    - activeConnections: number
    - idleConnections: number
    - databaseSizeMb: number
    - responseTimeMs: number
  - [x] Add `InngestJobMetrics` interface:
    - queuedCount: number | null
    - runningCount: number | null
    - recentFailures: Array<{ id, functionName, error, failedAt }>
    - successRateLast24h: number | null
    - dashboardUrl: string
    - **status: "healthy" | "degraded" | "error" | "unknown"** (REQUIRED)
  - [x] Add `EmailMetrics` interface:
    - sentLast24h: number | null
    - deliveredLast24h: number | null
    - failedLast24h: number | null
    - dashboardUrl: string
    - **status: "healthy" | "degraded" | "error" | "unknown"** (REQUIRED)
  - [x] Add `SystemAlert` interface:
    - id: string
    - severity: "info" | "warning" | "critical"
    - message: string
    - source: "database" | "inngest" | "email" | "application"
    - createdAt: Date
    - acknowledged: boolean
  - [x] Add `SystemHealthData` interface combining all above
  - [x] See Dev Notes section for complete TypeScript interface definitions

- [x] **Task 2: Replace Database Health Function** (AC: 2)
  - [x] Edit `src/modules/platform-admin/health.ts`
  - [x] **REPLACE** existing `getDatabaseHealthStatus()` with new `getDatabaseMetrics()` function
  - [x] New function queries:
    - pg_stat_database for connection counts (numbackends)
    - pg_database_size for database size
    - SELECT 1 ping for response time
    - Return DatabaseMetrics (new interface)
  - [x] **KEEP** existing `getInngestHealthStatus()` and `getEmailServiceStatus()` unchanged (used by dashboard)
  - [x] **UPDATE** `getPlatformDashboard()` in actions.ts to use new function:
    - Map new DatabaseMetrics to existing PlatformHealthStatus.database format
    - OR create wrapper to maintain backward compatibility
  - [x] NOTE: Neon doesn't expose connection pool via SQL - use `numbackends` as proxy
  - [x] NOTE: Slow query tracking requires pg_stat_statements (may not be available on Neon free tier)
  - [x] CRITICAL: All functions must gracefully handle errors - never throw, return error status instead

- [x] **Task 3: Create Inngest Job Monitoring Service** (AC: 3)
  - [x] Create `src/modules/platform-admin/job-monitoring.ts`
  - [x] **REFERENCE:** See `src/modules/admin/queries.ts` for existing tenant-level pattern (Story 6.6)
  - [x] Implement `getInngestJobMetrics()`:
    - Check if `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` are set
    - If Inngest REST API available, fetch queue stats
    - Otherwise return `status: "unknown"` with dashboard link (same pattern as Story 6.6)
  - [x] NOTE: Inngest REST API requires paid plan - fallback to dashboard link for free tier
  - [x] NOTE: Inngest SDK doesn't expose job stats programmatically (confirmed in Story 6.6)
  - [x] Include hardcoded dashboard URL: `https://app.inngest.com/env/development/apps/salina-erp`
  - [x] Return InngestJobMetrics with `status` field
  - [x] CRITICAL: Never throw - return error status on any failure

- [x] **Task 4: Create Email Monitoring Service** (AC: 5)
  - [x] Create `src/modules/platform-admin/email-monitoring.ts`
  - [x] Implement `getEmailMetrics()`:
    - Check if `RESEND_API_KEY` is set
    - If no API key: return `status: "unknown"` with dashboard link
    - If API call succeeds: return `status: "healthy"` with metrics
    - If API call fails: return `status: "error"` with dashboard link
  - [x] NOTE: Resend API provides /emails endpoint for recent sends
  - [x] Include hardcoded dashboard URL: `https://resend.com/overview`
  - [x] Return EmailMetrics with `status` field
  - [x] CRITICAL: Never throw - return error status on any failure (system monitoring must never crash)

- [x] **Task 5: Add System Health Server Action** (AC: 1-5)
  - [x] Edit `src/modules/platform-admin/actions.ts`
  - [x] Implement `getSystemHealth()`:
    - Validate platform admin authentication
    - Fetch database metrics, Inngest metrics, email metrics in parallel
    - Generate alerts based on thresholds:
      - Database response > 500ms → warning
      - Database response > 1000ms → critical
      - Inngest success rate < 95% → warning
      - Inngest success rate < 80% → critical
      - Email failures > 5% → warning
    - Log VIEW_SYSTEM_HEALTH audit event
    - Return SystemHealthData
  - [x] Implement `acknowledgeAlert(alertId)`:
    - Store acknowledgment in session/localStorage (no DB persistence)
    - Return success

- [x] **Task 6: Add Audit Constant** (AC: 1)
  - [x] Edit `src/lib/platform-audit.ts`
  - [x] Add `VIEW_SYSTEM_HEALTH: "view_system_health"` to PLATFORM_ADMIN_ACTIONS

### Frontend Tasks (Client-Side)

- [x] **Task 7: Create System Monitoring Page** (AC: 1)
  - [x] Create `src/app/(platform-admin)/platform-admin/system/page.tsx`
  - [x] Server component that fetches system health data
  - [x] Pass data to client component for interactivity
  - [x] Include auto-refresh functionality (30 second interval)

- [x] **Task 8: Create Database Health Card** (AC: 2)
  - [x] Create `src/modules/platform-admin/components/database-health-card.tsx`
  - [x] Display connection pool metrics
  - [x] Display database size
  - [x] Display response time with color coding
  - [x] Status indicator (green/amber/red dot)
  - [x] NOTE: Slow queries section can show "Not available" if pg_stat_statements unavailable

- [x] **Task 9: Create Inngest Jobs Card** (AC: 3)
  - [x] Create `src/modules/platform-admin/components/inngest-jobs-card.tsx`
  - [x] Display queue depth (queued + running)
  - [x] Display recent failures list (last 5) with expandable error details
  - [x] Display success rate percentage with color coding
  - [x] External link to Inngest dashboard (opens in new tab)
  - [x] Show "API unavailable - check dashboard" if no API access

- [x] **Task 10: Create Email Delivery Card** (AC: 5)
  - [x] Create `src/modules/platform-admin/components/email-delivery-card.tsx`
  - [x] Display sent/delivered/failed counts for last 24h
  - [x] Calculate and show delivery rate
  - [x] External link to Resend dashboard (opens in new tab)
  - [x] Show "API unavailable - check dashboard" if no API access

- [x] **Task 11: Create Alerts Section** (AC: 6)
  - [x] Create `src/modules/platform-admin/components/alerts-section.tsx`
  - [x] List all active alerts sorted by severity
  - [x] Color coding: critical (red), warning (amber), info (blue)
  - [x] Dismiss/acknowledge button per alert
  - [x] "No alerts" message when all clear
  - [x] Alerts persist in client state only (refresh resets)

- [x] **Task 12: Create System Monitoring Client Component** (AC: 1-6)
  - [x] Create `src/app/(platform-admin)/platform-admin/system/client.tsx`
  - [x] Define constant: `const AUTO_REFRESH_INTERVAL_MS = 30000; // 30 seconds`
  - [x] Compose all cards into grid layout
  - [x] Handle auto-refresh with useState/useEffect (use interval constant)
  - [x] Handle alert acknowledgment state (client-side only, resets on page refresh)
  - [x] Add refresh button for manual refresh
  - [x] Show last updated timestamp

### Navigation Tasks

- [x] **Task 13: Update Platform Admin Navigation** (AC: 1)
  - [x] Edit `src/app/(platform-admin)/platform-admin/page.tsx`
  - [x] Add `Activity` to lucide-react import (line 16): `import { Building2, Activity } from "lucide-react";`
  - [x] **REMOVE** from `upcomingFeatures` array (around line 39-43):
    ```typescript
    { title: "System Health", description: "Monitor database, jobs, and services", story: "13.7" },
    ```
  - [x] **ADD** to `activeFeatures` array (around line 23-31):
    ```typescript
    {
      title: "System Health",
      description: "Monitor database, jobs, and services",
      href: "/platform-admin/system",
      icon: Activity,
      story: "13.7",
    },
    ```

### Testing

- [x] **Task 14: Write Unit Tests** (All ACs)
  - [x] Create `tests/unit/platform-system-health.test.ts`
  - [x] Test getSystemHealth requires platform admin auth
  - [x] Test getDatabaseMetrics returns correct structure
  - [x] Test getDatabaseMetrics handles database errors gracefully
  - [x] Test getInngestJobMetrics handles missing env vars
  - [x] Test getEmailMetrics handles missing API key
  - [x] Test alert generation based on thresholds
  - [x] Test acknowledgeAlert updates state correctly
  - [x] Mock fetch for Inngest/Resend API calls

---

## Dev Notes

### Critical: Database Metrics Implementation

**PostgreSQL System Catalog Queries:**

```typescript
// src/modules/platform-admin/health.ts

import { sql } from "drizzle-orm";
import { adminDb } from "@/db";

export async function getDatabaseMetrics(): Promise<DatabaseMetrics> {
  const start = Date.now();

  try {
    // Basic connectivity check
    await adminDb.execute(sql`SELECT 1`);
    const responseTimeMs = Date.now() - start;

    // Get connection stats from pg_stat_database
    const connStats = await adminDb.execute(sql`
      SELECT numbackends as active_connections
      FROM pg_stat_database
      WHERE datname = current_database()
    `);

    // Get database size
    const sizeResult = await adminDb.execute(sql`
      SELECT pg_database_size(current_database()) as size_bytes
    `);

    const activeConnections = Number(connStats.rows[0]?.active_connections ?? 0);
    const sizeBytes = Number(sizeResult.rows[0]?.size_bytes ?? 0);

    return {
      connectionPoolStatus: responseTimeMs < 100 ? "healthy" : responseTimeMs < 500 ? "degraded" : "error",
      activeConnections,
      idleConnections: 0, // Neon doesn't expose this
      databaseSizeMb: Math.round(sizeBytes / (1024 * 1024)),
      responseTimeMs,
    };
  } catch (error) {
    return {
      connectionPoolStatus: "error",
      activeConnections: 0,
      idleConnections: 0,
      databaseSizeMb: 0,
      responseTimeMs: Date.now() - start,
    };
  }
}
```

### Critical: Inngest REST API

**Note:** Inngest REST API is limited. The SDK doesn't expose job status methods directly (per Story 6.6 notes). Implementation should gracefully degrade to dashboard link.

```typescript
// src/modules/platform-admin/job-monitoring.ts

const INNGEST_DASHBOARD_URL = process.env.INNGEST_DASHBOARD_URL
  ?? "https://app.inngest.com/env/development/apps/salina-erp";

export async function getInngestJobMetrics(): Promise<InngestJobMetrics> {
  // Inngest SDK doesn't expose job stats programmatically
  // Return dashboard link for manual verification
  return {
    queuedCount: null, // Unknown without API access
    runningCount: null,
    recentFailures: [],
    successRateLast24h: null,
    dashboardUrl: INNGEST_DASHBOARD_URL,
    status: "unknown", // Indicates manual check needed
  };
}
```

### Critical: Resend API Integration

**Resend API provides limited stats.** For email metrics:

```typescript
// src/modules/platform-admin/email-monitoring.ts

const RESEND_DASHBOARD_URL = "https://resend.com/overview";

export async function getEmailMetrics(): Promise<EmailMetrics> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      sentLast24h: null,
      deliveredLast24h: null,
      failedLast24h: null,
      dashboardUrl: RESEND_DASHBOARD_URL,
      status: "unknown",
    };
  }

  try {
    // Resend API: GET /emails returns recent emails
    // Note: Limited to recent emails, not full analytics
    const response = await fetch("https://api.resend.com/emails", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error("Resend API error");
    }

    const data = await response.json();
    // Process data.data array to count statuses
    // Note: This is simplified - actual implementation needs pagination

    return {
      sentLast24h: data.data?.length ?? 0,
      deliveredLast24h: null, // Requires checking individual email status
      failedLast24h: null,
      dashboardUrl: RESEND_DASHBOARD_URL,
      status: "healthy",
    };
  } catch {
    return {
      sentLast24h: null,
      deliveredLast24h: null,
      failedLast24h: null,
      dashboardUrl: RESEND_DASHBOARD_URL,
      status: "error",
    };
  }
}
```

### System Health Server Action

```typescript
// src/modules/platform-admin/actions.ts - ADD:

export async function getSystemHealth(): Promise<ActionResult<SystemHealthData>> {
  try {
    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized: Platform admin access required" };
    }

    // Log audit event
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.VIEW_SYSTEM_HEALTH,
      route: "/platform-admin/system",
      metadata: {},
    });

    // Fetch all metrics in parallel
    const [database, inngest, email] = await Promise.all([
      getDatabaseMetrics(),
      getInngestJobMetrics(),
      getEmailMetrics(),
    ]);

    // Generate alerts based on thresholds
    const alerts: SystemAlert[] = [];

    if (database.responseTimeMs > 1000) {
      alerts.push({
        id: crypto.randomUUID(),
        severity: "critical",
        message: `Database response time critical: ${database.responseTimeMs}ms`,
        source: "database",
        createdAt: new Date(),
        acknowledged: false,
      });
    } else if (database.responseTimeMs > 500) {
      alerts.push({
        id: crypto.randomUUID(),
        severity: "warning",
        message: `Database response time degraded: ${database.responseTimeMs}ms`,
        source: "database",
        createdAt: new Date(),
        acknowledged: false,
      });
    }

    if (database.connectionPoolStatus === "error") {
      alerts.push({
        id: crypto.randomUUID(),
        severity: "critical",
        message: "Database connection pool error",
        source: "database",
        createdAt: new Date(),
        acknowledged: false,
      });
    }

    return {
      success: true,
      data: {
        database,
        inngest,
        email,
        alerts,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("getSystemHealth error:", error);
    return { success: false, error: "Failed to load system health" };
  }
}
```

### Type Definitions

```typescript
// src/modules/platform-admin/types.ts - ADD:

/**
 * Database health metrics
 * Story 13.7: Build System Health and Job Monitoring (AC: 2)
 */
export interface DatabaseMetrics {
  connectionPoolStatus: "healthy" | "degraded" | "error";
  activeConnections: number;
  idleConnections: number;
  databaseSizeMb: number;
  responseTimeMs: number;
}

/**
 * Inngest background job metrics
 * Story 13.7: Build System Health and Job Monitoring (AC: 3)
 */
export interface InngestJobMetrics {
  queuedCount: number | null;
  runningCount: number | null;
  recentFailures: Array<{
    id: string;
    functionName: string;
    error: string;
    failedAt: Date;
  }>;
  successRateLast24h: number | null;
  dashboardUrl: string;
  status: "healthy" | "degraded" | "error" | "unknown";
}

/**
 * Email service metrics
 * Story 13.7: Build System Health and Job Monitoring (AC: 5)
 */
export interface EmailMetrics {
  sentLast24h: number | null;
  deliveredLast24h: number | null;
  failedLast24h: number | null;
  dashboardUrl: string;
  status: "healthy" | "degraded" | "error" | "unknown";
}

/**
 * System health alert
 * Story 13.7: Build System Health and Job Monitoring (AC: 6)
 */
export interface SystemAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  source: "database" | "inngest" | "email" | "application";
  createdAt: Date;
  acknowledged: boolean;
}

/**
 * Combined system health data
 * Story 13.7: Build System Health and Job Monitoring (AC: 1-6)
 */
export interface SystemHealthData {
  database: DatabaseMetrics;
  inngest: InngestJobMetrics;
  email: EmailMetrics;
  alerts: SystemAlert[];
  generatedAt: string; // ISO string
}
```

### System Monitoring Page

```typescript
// src/app/(platform-admin)/platform-admin/system/page.tsx

import { getCurrentPlatformAdmin } from "@/lib/platform-admin";
import { getSystemHealth } from "@/modules/platform-admin/actions";
import { SystemMonitoringClient } from "./client";

export default async function SystemMonitoringPage() {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) {
    return null; // Layout handles redirect
  }

  const result = await getSystemHealth();

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-3xl font-bold text-white">System Monitoring</h1>
      <p className="mb-8 text-slate-400">
        Monitor database, background jobs, and email service health
      </p>

      {result.success && result.data ? (
        <SystemMonitoringClient initialData={result.data} />
      ) : (
        <div className="rounded-lg border border-red-700 bg-red-900/20 p-4">
          <p className="text-red-400">
            Failed to load system health: {!result.success ? result.error : "Unknown error"}
          </p>
        </div>
      )}
    </div>
  );
}
```

### System Monitoring Client Component

```typescript
// src/app/(platform-admin)/platform-admin/system/client.tsx
"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatabaseHealthCard } from "@/modules/platform-admin/components/database-health-card";
import { InngestJobsCard } from "@/modules/platform-admin/components/inngest-jobs-card";
import { EmailDeliveryCard } from "@/modules/platform-admin/components/email-delivery-card";
import { AlertsSection } from "@/modules/platform-admin/components/alerts-section";
import type { SystemHealthData } from "@/modules/platform-admin/types";
import { getSystemHealth } from "@/modules/platform-admin/actions";

/** Auto-refresh interval for system health data */
const AUTO_REFRESH_INTERVAL_MS = 30000; // 30 seconds

interface SystemMonitoringClientProps {
  initialData: SystemHealthData;
}

export function SystemMonitoringClient({ initialData }: SystemMonitoringClientProps) {
  const [data, setData] = useState(initialData);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh at configured interval
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getSystemHealth();
      if (result.success && result.data) {
        setData(result.data);
      }
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const result = await getSystemHealth();
    if (result.success && result.data) {
      setData(result.data);
    }
    setIsRefreshing(false);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAcknowledgedAlerts((prev) => new Set([...prev, alertId]));
  };

  const activeAlerts = data.alerts.filter((a) => !acknowledgedAlerts.has(a.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Last updated: {new Date(data.generatedAt).toLocaleString()}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <AlertsSection
        alerts={activeAlerts}
        onAcknowledge={handleAcknowledgeAlert}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DatabaseHealthCard metrics={data.database} />
        <InngestJobsCard metrics={data.inngest} />
        <EmailDeliveryCard metrics={data.email} />
      </div>
    </div>
  );
}
```

### Project Structure Notes

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/modules/platform-admin/job-monitoring.ts` | Inngest job metrics (mostly dashboard link) |
| `src/modules/platform-admin/email-monitoring.ts` | Resend email metrics |
| `src/modules/platform-admin/components/database-health-card.tsx` | Database metrics display |
| `src/modules/platform-admin/components/inngest-jobs-card.tsx` | Job queue display |
| `src/modules/platform-admin/components/email-delivery-card.tsx` | Email stats display |
| `src/modules/platform-admin/components/alerts-section.tsx` | Alert list with dismiss |
| `src/app/(platform-admin)/platform-admin/system/page.tsx` | System monitoring page |
| `src/app/(platform-admin)/platform-admin/system/client.tsx` | Client interactivity |
| `tests/unit/platform-system-health.test.ts` | Unit tests |

**Files to Modify:**
| File | Change |
|------|--------|
| `src/modules/platform-admin/types.ts` | ADD DatabaseMetrics, InngestJobMetrics, EmailMetrics, SystemAlert, SystemHealthData (keep existing PlatformHealthStatus) |
| `src/modules/platform-admin/health.ts` | REPLACE getDatabaseHealthStatus() with getDatabaseMetrics(); UPDATE getPlatformDashboard() caller |
| `src/modules/platform-admin/actions.ts` | ADD getSystemHealth server action (keep getPlatformDashboard unchanged) |
| `src/lib/platform-audit.ts` | ADD VIEW_SYSTEM_HEALTH constant to PLATFORM_ADMIN_ACTIONS |
| `src/app/(platform-admin)/platform-admin/page.tsx` | ADD Activity import; MOVE System Health from upcomingFeatures to activeFeatures |

### Dependencies

- No new npm packages needed
- Uses existing `adminDb` from `@/db`
- Uses existing shadcn/ui components (Card, Button)
- Uses lucide-react icons

### Critical: Relationship to Existing Dashboard

**This story creates a NEW page, NOT a replacement:**

| Feature | Existing Dashboard (`/platform-admin`) | New System Page (`/platform-admin/system`) |
|---------|---------------------------------------|-------------------------------------------|
| Action | `getPlatformDashboard()` | `getSystemHealth()` |
| Types | `PlatformHealthStatus` | `SystemHealthData` |
| Scope | Overview metrics + basic health | Detailed health monitoring + alerts |
| Health Data | Simple status only | Full metrics (connections, size, etc.) |

**IMPORTANT:** The existing `getPlatformDashboard()` function and `PlatformHealthStatus` type must continue working unchanged. This story ADDS new functionality alongside existing code.

### Relationship to Story 6.6

Story 6.6 created **tenant-level** job monitoring at `/admin/system`:
- Uses `src/modules/admin/queries.ts` (returns empty mock data - Inngest SDK limitation)
- Uses `src/modules/admin/types.ts` (JobSummary, JobEntry types)
- Lives in tenant dashboard
- **Pattern to follow:** Returns `status: "unknown"` with dashboard link when API unavailable

Story 13.7 creates **platform-level** system monitoring at `/platform-admin/system`:
- Broader scope: database, jobs, email, alerts
- Platform admin access only
- Can leverage existing job types from Story 6.6 if needed
- Should NOT duplicate the tenant-level UI components
- **MUST follow same graceful degradation pattern as Story 6.6**

### Security Considerations

1. **Platform Admin Only:** All endpoints require platform admin authentication
2. **Audit Logged:** VIEW_SYSTEM_HEALTH action logged for compliance
3. **No Sensitive Data:** Database queries don't expose table contents
4. **External Dashboard Links:** Open in new tab with rel="noopener noreferrer"

### References

- [Source: docs/epics.md#Story-13.7]
- [Source: src/modules/platform-admin/health.ts] - Existing basic health checks
- [Source: src/modules/platform-admin/types.ts] - PlatformHealthStatus type
- [Source: src/modules/platform-admin/actions.ts] - Existing action patterns
- [Source: src/modules/admin/queries.ts] - Story 6.6 job monitoring (tenant-level)
- [Source: src/lib/platform-audit.ts] - Audit logging patterns
- [Source: src/inngest/client.ts] - Inngest client config
- [Source: docs/architecture.md] - Tech stack and patterns

---

## Dev Agent Record

### Context Reference

- Story 13.5 (Platform Analytics Dashboard) - DONE
- Story 13.6 (Tenant Impersonation) - DONE
- Story 6.6 (Background Job Monitoring - tenant-level) - DONE

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All 189 platform tests pass (13 new tests added)
- Backward compatibility maintained - existing `getDatabaseHealthStatus()` now uses `getDatabaseMetrics()` internally

### Completion Notes List

1. **Types Added** (AC: 1-5): `DatabaseMetrics`, `InngestJobMetrics`, `EmailMetrics`, `SystemAlert`, `SystemHealthData` interfaces added to types.ts
2. **Database Metrics** (AC: 2): New `getDatabaseMetrics()` function queries pg_stat_database for active connections and pg_database_size for database size; `getDatabaseHealthStatus()` refactored to use new function for backward compatibility
3. **Inngest Monitoring** (AC: 3): Returns `status: "unknown"` with dashboard link (API not available per Story 6.6)
4. **Email Monitoring** (AC: 5): Integrates with Resend API when key available, graceful fallback to "unknown" status
5. **Server Action** (AC: 1-6): `getSystemHealth()` fetches all metrics in parallel, generates alerts based on thresholds
6. **UI Components** (AC: 2, 3, 5, 6): Created DatabaseHealthCard, InngestJobsCard, EmailDeliveryCard, AlertsSection components
7. **System Page** (AC: 1): New `/platform-admin/system` route with 30-second auto-refresh
8. **Navigation** (AC: 1): Added System Health to Quick Access section, removed from Coming Soon
9. **Audit Logging** (AC: 1): Added VIEW_SYSTEM_HEALTH action constant
10. **Tests**: 13 unit tests covering auth, metrics, error handling, and alert generation

### File List

**New Files:**
- src/modules/platform-admin/job-monitoring.ts
- src/modules/platform-admin/email-monitoring.ts
- src/modules/platform-admin/components/database-health-card.tsx
- src/modules/platform-admin/components/inngest-jobs-card.tsx
- src/modules/platform-admin/components/email-delivery-card.tsx
- src/modules/platform-admin/components/alerts-section.tsx
- src/app/(platform-admin)/platform-admin/system/page.tsx
- src/app/(platform-admin)/platform-admin/system/client.tsx
- tests/unit/platform-system-health.test.ts

**Modified Files:**
- src/modules/platform-admin/types.ts (added 5 new interfaces)
- src/modules/platform-admin/health.ts (added getDatabaseMetrics, refactored getDatabaseHealthStatus)
- src/modules/platform-admin/actions.ts (added getSystemHealth action)
- src/lib/platform-audit.ts (added VIEW_SYSTEM_HEALTH constant)
- src/app/(platform-admin)/platform-admin/page.tsx (updated navigation)

### Change Log

- 2025-12-12: Implemented Story 13.7 - System Health and Job Monitoring
  - Created system monitoring page at /platform-admin/system
  - Added detailed database metrics (connections, size, response time)
  - Added Inngest job monitoring with dashboard link fallback
  - Added Resend email metrics with API integration
  - Added alert system with severity levels and acknowledgment
  - 30-second auto-refresh for real-time monitoring
  - 13 unit tests covering all functionality
