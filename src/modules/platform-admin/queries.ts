/**
 * Platform Admin Tenant Queries
 *
 * Story 13.2: Build Tenant List and Search Interface
 * Story 13.3: Build Tenant Detail View
 *
 * CRITICAL: Uses adminDb to bypass RLS - platform admin operates outside tenant context.
 * DO NOT use db or getAuthenticatedDb() here.
 */

import { and, asc, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { adminDb } from "@/db";
import type { Tenant } from "@/db/schema";
import {
  auditLogs,
  contacts,
  sales,
  statements,
  tenants,
  titles,
  users,
} from "@/db/schema";
import type {
  GetTenantsOptions,
  PaginatedTenantsResult,
  PlatformTenantMetrics,
  PlatformUsageMetrics,
  PlatformUserMetrics,
  TenantActivityLog,
  TenantGrowthDataPoint,
  TenantUsageMetrics,
  TenantUser,
} from "./types";

/**
 * UUID validation regex
 * Story 13.3: Validates tenant ID format before database queries
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 * @param id - String to validate
 * @returns true if valid UUID format
 */
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Get tenants with user counts, search, filter, sort, and pagination
 * Story 13.4: Added status column select and status filtering
 *
 * @param options - Query options for filtering, sorting, and pagination
 * @returns Paginated result with tenant data
 */
export async function getTenants(
  options: GetTenantsOptions = {},
): Promise<PaginatedTenantsResult> {
  const {
    search,
    status = "all",
    sortBy = "name",
    sortOrder = "asc",
    page: rawPage = 1,
    pageSize: rawPageSize = 25,
  } = options;

  // Validate and sanitize pagination inputs
  const page = Math.max(1, Math.floor(rawPage));
  const pageSize = Math.min(100, Math.max(1, Math.floor(rawPageSize)));

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
        ilike(tenants.subdomain, `%${search}%`),
      ),
    );
  }

  // Story 13.4: Status filter enabled
  if (status !== "all") {
    conditions.push(eq(tenants.status, status));
  }

  // Sort configuration
  const sortColumn =
    sortBy === "name"
      ? tenants.name
      : sortBy === "created_at"
        ? tenants.created_at
        : sql`COALESCE(user_counts.user_count, 0)`;

  const orderFn = sortOrder === "desc" ? desc : asc;

  // Calculate offset
  const offset = (page - 1) * pageSize;
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Execute paginated query with user counts and status
  const result = await adminDb
    .select({
      id: tenants.id,
      name: tenants.name,
      subdomain: tenants.subdomain,
      status: tenants.status,
      created_at: tenants.created_at,
      user_count: sql<number>`COALESCE(user_counts.user_count, 0)`,
    })
    .from(tenants)
    .leftJoin(userCountSubquery, eq(tenants.id, userCountSubquery.tenant_id))
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(pageSize)
    .offset(offset);

  // Get total count for pagination
  const [countResult] = await adminDb
    .select({ total: count() })
    .from(tenants)
    .where(whereClause);

  const total = countResult?.total ?? 0;

  return {
    // Story 13.4: Use actual status from database
    tenants: result.map((t) => ({
      ...t,
      status: (t.status as "active" | "suspended") ?? "active",
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get a single tenant by ID
 * Story 13.3: Build Tenant Detail View (AC: 1-3)
 *
 * @param id - Tenant UUID
 * @returns Tenant or null if not found/invalid UUID
 */
export async function getTenantById(id: string): Promise<Tenant | null> {
  if (!isValidUUID(id)) {
    return null;
  }

  const result = await adminDb.query.tenants.findFirst({
    where: eq(tenants.id, id),
  });

  return result ?? null;
}

/**
 * Get usage metrics for a tenant
 * Story 13.3: Build Tenant Detail View (AC: 5)
 *
 * @param tenantId - Tenant UUID
 * @returns Usage metrics (contacts, titles, sales, statements counts)
 */
export async function getTenantUsageMetrics(
  tenantId: string,
): Promise<TenantUsageMetrics> {
  const [contactResult, titleResult, salesResult, statementResult] =
    await Promise.all([
      adminDb
        .select({ count: count() })
        .from(contacts)
        .where(eq(contacts.tenant_id, tenantId)),
      adminDb
        .select({ count: count() })
        .from(titles)
        .where(eq(titles.tenant_id, tenantId)),
      adminDb
        .select({ count: count() })
        .from(sales)
        .where(eq(sales.tenant_id, tenantId)),
      adminDb
        .select({ count: count() })
        .from(statements)
        .where(eq(statements.tenant_id, tenantId)),
    ]);

  return {
    contactCount: contactResult[0]?.count ?? 0,
    titleCount: titleResult[0]?.count ?? 0,
    salesCount: salesResult[0]?.count ?? 0,
    statementCount: statementResult[0]?.count ?? 0,
  };
}

/**
 * Get all users for a tenant
 * Story 13.3: Build Tenant Detail View (AC: 4)
 * Story 13.6: Added clerk_user_id for impersonation support (AC: 1, 8)
 *
 * @param tenantId - Tenant UUID
 * @returns List of users with email, role, is_active status, clerk_user_id
 */
export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
  const result = await adminDb
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      is_active: users.is_active,
      created_at: users.created_at,
      clerk_user_id: users.clerk_user_id,
    })
    .from(users)
    .where(eq(users.tenant_id, tenantId))
    .orderBy(asc(users.email));

  return result as TenantUser[];
}

/**
 * Get recent activity for a tenant
 * Story 13.3: Build Tenant Detail View (AC: 6, 7)
 *
 * @param tenantId - Tenant UUID
 * @param limit - Maximum number of entries (default 50)
 * @returns List of audit log entries with user email
 */
export async function getTenantActivity(
  tenantId: string,
  limit = 50,
): Promise<TenantActivityLog[]> {
  const result = await adminDb
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

  return result as TenantActivityLog[];
}

/**
 * Get the owner email for a tenant
 * Story 13.4: Implement Tenant Suspension and Reactivation (AC: 9)
 *
 * @param tenantId - Tenant UUID
 * @returns Owner email or null if no owner found
 */
export async function getTenantOwnerEmail(
  tenantId: string,
): Promise<string | null> {
  const owner = await adminDb.query.users.findFirst({
    where: and(eq(users.tenant_id, tenantId), eq(users.role, "owner")),
  });
  return owner?.email ?? null;
}

/**
 * Get platform-wide tenant metrics
 * Story 13.5: Build Platform Analytics Dashboard (AC: 2)
 *
 * Note: "Active" is defined as tenants where any user's updated_at field
 * was modified in the last 30 days. This serves as a proxy for activity.
 * Future enhancement: Use audit_logs or dedicated last_login_at field.
 *
 * @returns Tenant metrics: total, active (30d), new this month, suspended
 */
export async function getPlatformTenantMetrics(): Promise<PlatformTenantMetrics> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Count tenants with any user record update in last 30 days (proxy for activity)
  const activeTenantsSubquery = adminDb
    .selectDistinct({ tenant_id: users.tenant_id })
    .from(users)
    .where(gte(users.updated_at, thirtyDaysAgo));

  const [totalResult, activeResult, newResult, suspendedResult] =
    await Promise.all([
      adminDb.select({ count: count() }).from(tenants),
      adminDb
        .select({ count: count() })
        .from(activeTenantsSubquery.as("active")),
      adminDb
        .select({ count: count() })
        .from(tenants)
        .where(gte(tenants.created_at, monthStart)),
      adminDb
        .select({ count: count() })
        .from(tenants)
        .where(eq(tenants.status, "suspended")),
    ]);

  return {
    total: totalResult[0]?.count ?? 0,
    activeLastThirtyDays: activeResult[0]?.count ?? 0,
    newThisMonth: newResult[0]?.count ?? 0,
    suspended: suspendedResult[0]?.count ?? 0,
  };
}

/**
 * Get tenant growth trend over specified months
 * Story 13.5: Build Platform Analytics Dashboard (AC: 2)
 *
 * @param months - Number of months to retrieve (1-24, default 6)
 * @returns Monthly data points with count of new tenants
 */
export async function getTenantGrowthTrend(
  months = 6,
): Promise<TenantGrowthDataPoint[]> {
  // SECURITY: Validate months parameter to prevent SQL injection
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

/**
 * Get platform-wide user metrics with role breakdown
 * Story 13.5: Build Platform Analytics Dashboard (AC: 3)
 *
 * @returns User metrics: total, active (30d), breakdown by role
 */
export async function getPlatformUserMetrics(): Promise<PlatformUserMetrics> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalResult, activeResult, roleResult] = await Promise.all([
    adminDb.select({ count: count() }).from(users),
    adminDb
      .select({ count: count() })
      .from(users)
      .where(gte(users.updated_at, thirtyDaysAgo)),
    adminDb
      .select({ role: users.role, count: count() })
      .from(users)
      .groupBy(users.role),
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

/**
 * Get platform-wide usage metrics
 * Story 13.5: Build Platform Analytics Dashboard (AC: 4)
 *
 * @returns Usage metrics: total titles, sales this month, statements this month
 */
export async function getPlatformUsageMetrics(): Promise<PlatformUsageMetrics> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [titlesResult, salesResult, statementsResult] = await Promise.all([
    adminDb.select({ count: count() }).from(titles),
    adminDb
      .select({ count: count() })
      .from(sales)
      .where(gte(sales.created_at, monthStart)),
    adminDb
      .select({ count: count() })
      .from(statements)
      .where(gte(statements.created_at, monthStart)),
  ]);

  return {
    totalTitles: titlesResult[0]?.count ?? 0,
    salesThisMonth: salesResult[0]?.count ?? 0,
    statementsThisMonth: statementsResult[0]?.count ?? 0,
  };
}
