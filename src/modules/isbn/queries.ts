"use server";

import { and, count, eq, ilike, isNull, sql } from "drizzle-orm";
import { isbnPrefixes } from "@/db/schema/isbn-prefixes";
import { isbns } from "@/db/schema/isbns";
import { titles } from "@/db/schema/titles";
import { users } from "@/db/schema/users";
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import { VIEW_OWN_STATEMENTS } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { formatPrefix } from "@/modules/isbn-prefixes/utils";
import type {
  ISBNListItem,
  ISBNPoolStats,
  ISBNStatus,
  ISBNType,
  NextAvailableISBNPreview,
} from "./types";

/**
 * Paginated result for ISBN list queries
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Filter parameters for ISBN list query
 */
export interface ISBNListFilters {
  type?: ISBNType;
  status?: ISBNStatus;
  search?: string;
  /** Filter by prefix ID, or "legacy" for ISBNs without a prefix */
  prefix?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Get ISBN pool statistics for dashboard and stats cards
 * Permission: VIEW_OWN_STATEMENTS (all authenticated users)
 *
 * Story 2.8 - Build ISBN Pool Status View and Availability Tracking
 * AC 1, 2, 3: Dashboard widget and stats cards need aggregate counts
 *
 * Uses a single efficient aggregation query for all stats
 * Multi-tenant isolation via tenant_id filter
 */
export async function getISBNPoolStats(): Promise<ActionResult<ISBNPoolStats>> {
  try {
    await requirePermission(VIEW_OWN_STATEMENTS);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Single aggregation query for efficiency
    // Story 7.6: Removed type-based counting - ISBNs are unified without type distinction
    const result = await db
      .select({
        total: count(),
        available: sql<number>`count(*) filter (where ${isbns.status} = 'available')`,
        assigned: sql<number>`count(*) filter (where ${isbns.status} = 'assigned')`,
        registered: sql<number>`count(*) filter (where ${isbns.status} = 'registered')`,
        retired: sql<number>`count(*) filter (where ${isbns.status} = 'retired')`,
      })
      .from(isbns)
      .where(eq(isbns.tenant_id, tenantId));

    const stats = result[0];

    // Story 7.6: Removed byType and availableByType - ISBNs are unified
    return {
      success: true,
      data: {
        total: stats?.total ?? 0,
        available: Number(stats?.available) ?? 0,
        assigned: Number(stats?.assigned) ?? 0,
        registered: Number(stats?.registered) ?? 0,
        retired: Number(stats?.retired) ?? 0,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view ISBN pool",
      };
    }

    console.error("getISBNPoolStats error:", error);
    return { success: false, error: "Failed to load ISBN pool statistics" };
  }
}

/**
 * Get paginated list of ISBNs with filters
 * Permission: VIEW_OWN_STATEMENTS (all authenticated users)
 *
 * Story 2.8 - Build ISBN Pool Status View and Availability Tracking
 * AC 4, 5, 6: Table with columns, filtering, pagination
 *
 * Story 7.4 - AC 7.4.7: Filter ISBN pool table by prefix
 *
 * Supports:
 * - Type filter (physical/ebook)
 * - Status filter (available/assigned/registered/retired)
 * - Prefix filter (specific prefix ID or "legacy" for ISBNs without prefix)
 * - Search by ISBN-13 partial match (ILIKE)
 * - Pagination (default 20 per page)
 *
 * Multi-tenant isolation via tenant_id filter
 */
export async function getISBNList(
  filters: ISBNListFilters = {},
): Promise<ActionResult<PaginatedResult<ISBNListItem>>> {
  try {
    await requirePermission(VIEW_OWN_STATEMENTS);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const { type, status, search, prefix, page = 1, pageSize = 20 } = filters;
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions = [eq(isbns.tenant_id, tenantId)];

    if (type) {
      conditions.push(eq(isbns.type, type));
    }

    if (status) {
      conditions.push(eq(isbns.status, status));
    }

    if (search) {
      conditions.push(ilike(isbns.isbn_13, `%${search}%`));
    }

    // Story 7.4 AC-7.4.7: Prefix filter
    if (prefix) {
      if (prefix === "legacy") {
        conditions.push(isNull(isbns.prefix_id));
      } else {
        conditions.push(eq(isbns.prefix_id, prefix));
      }
    }

    const whereClause = and(...conditions);

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: count() })
      .from(isbns)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Get paginated data with joins (including prefix for Story 7.4)
    const data = await db
      .select({
        id: isbns.id,
        isbn_13: isbns.isbn_13,
        type: isbns.type,
        status: isbns.status,
        assignedTitleName: titles.title,
        assignedAt: isbns.assigned_at,
        assignedToTitleId: isbns.assigned_to_title_id,
        assignedByUserName: users.email,
        prefixId: isbns.prefix_id,
        prefixValue: isbnPrefixes.prefix,
      })
      .from(isbns)
      .leftJoin(titles, eq(isbns.assigned_to_title_id, titles.id))
      .leftJoin(users, eq(isbns.assigned_by_user_id, users.id))
      .leftJoin(isbnPrefixes, eq(isbns.prefix_id, isbnPrefixes.id))
      .where(whereClause)
      .orderBy(isbns.created_at)
      .limit(pageSize)
      .offset(offset);

    // Story 7.6: Removed type field from mapping - ISBNs are unified
    const items: ISBNListItem[] = data.map((row) => ({
      id: row.id,
      isbn_13: row.isbn_13,
      status: row.status as ISBNStatus,
      assignedTitleName: row.assignedTitleName,
      assignedAt: row.assignedAt,
      prefixId: row.prefixId,
      prefixName: row.prefixValue ? formatPrefix(row.prefixValue) : null,
    }));

    return {
      success: true,
      data: {
        data: items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view ISBN list",
      };
    }

    console.error("getISBNList error:", error);
    return { success: false, error: "Failed to load ISBN list" };
  }
}

/**
 * Get single ISBN with full details including relations
 * Permission: VIEW_OWN_STATEMENTS (all authenticated users)
 *
 * Story 2.8 - AC 7: ISBN detail modal needs comprehensive information
 */
export async function getISBNById(id: string): Promise<
  ActionResult<{
    id: string;
    isbn_13: string;
    type: ISBNType;
    status: ISBNStatus;
    assignedToTitleId: string | null;
    assignedTitleName: string | null;
    assignedByUserName: string | null;
    assignedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  try {
    await requirePermission(VIEW_OWN_STATEMENTS);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const [result] = await db
      .select({
        id: isbns.id,
        isbn_13: isbns.isbn_13,
        type: isbns.type,
        status: isbns.status,
        assignedToTitleId: isbns.assigned_to_title_id,
        assignedTitleName: titles.title,
        assignedByUserName: users.email,
        assignedAt: isbns.assigned_at,
        createdAt: isbns.created_at,
        updatedAt: isbns.updated_at,
      })
      .from(isbns)
      .leftJoin(titles, eq(isbns.assigned_to_title_id, titles.id))
      .leftJoin(users, eq(isbns.assigned_by_user_id, users.id))
      .where(and(eq(isbns.id, id), eq(isbns.tenant_id, tenantId)));

    if (!result) {
      return { success: false, error: "ISBN not found" };
    }

    return {
      success: true,
      data: {
        id: result.id,
        isbn_13: result.isbn_13,
        type: result.type as ISBNType,
        status: result.status as ISBNStatus,
        assignedToTitleId: result.assignedToTitleId,
        assignedTitleName: result.assignedTitleName,
        assignedByUserName: result.assignedByUserName,
        assignedAt: result.assignedAt,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view ISBN details",
      };
    }

    console.error("getISBNById error:", error);
    return { success: false, error: "Failed to load ISBN details" };
  }
}

/**
 * Get preview of next available ISBN for assignment modal
 * Permission: VIEW_OWN_STATEMENTS (all authenticated users)
 *
 * Story 2.9 - Smart ISBN Assignment with Row Locking
 * AC 1: Modal displays the specific ISBN-13 that will be assigned
 *
 * Note: This is a READ-ONLY preview - actual assignment uses row locking
 * The displayed ISBN may be assigned by another user before assignment completes
 *
 * @param format - "physical" or "ebook"
 * @returns Next available ISBN preview with count, or null if none available
 */
export async function getNextAvailableISBN(
  format: ISBNType,
): Promise<ActionResult<NextAvailableISBNPreview | null>> {
  try {
    await requirePermission(VIEW_OWN_STATEMENTS);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get count of available ISBNs for this format
    const [countResult] = await db
      .select({ count: count() })
      .from(isbns)
      .where(
        and(
          eq(isbns.tenant_id, tenantId),
          eq(isbns.status, "available"),
          eq(isbns.type, format),
        ),
      );

    const availableCount = countResult?.count ?? 0;

    if (availableCount === 0) {
      return {
        success: true,
        data: null,
      };
    }

    // Get first available ISBN (sorted by created_at to maintain FIFO order)
    const [nextISBN] = await db
      .select({ id: isbns.id, isbn_13: isbns.isbn_13 })
      .from(isbns)
      .where(
        and(
          eq(isbns.tenant_id, tenantId),
          eq(isbns.status, "available"),
          eq(isbns.type, format),
        ),
      )
      .orderBy(isbns.created_at)
      .limit(1);

    if (!nextISBN) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        id: nextISBN.id,
        isbn_13: nextISBN.isbn_13,
        availableCount,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view ISBN preview",
      };
    }

    console.error("getNextAvailableISBN error:", error);
    return { success: false, error: "Failed to load ISBN preview" };
  }
}
