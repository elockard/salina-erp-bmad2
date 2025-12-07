"use server";

/**
 * Returns Module Queries
 *
 * Database queries for returns management.
 * Provides title search for returns form autocomplete.
 * Provides history queries for returns listing with filtering, sorting, pagination.
 *
 * Story 3.5: Build Return Request Entry Form
 * Story 3.7: Build Returns History View with Status Filtering
 * Related ACs: 2 (title autocomplete), 3-8 (filtering, sorting, pagination)
 *
 * CONSTRAINT: Only titles with at least one ISBN assigned are returned
 */

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  lte,
  min,
  or,
  sql,
  sum,
} from "drizzle-orm";
import { authors } from "@/db/schema/authors";
import { returns } from "@/db/schema/returns";
import { tenants } from "@/db/schema/tenants";
import { titles } from "@/db/schema/titles";
import { users } from "@/db/schema/users";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import type {
  ApprovalQueueSummary,
  PaginatedReturns,
  PendingReturn,
  ReturnsHistoryFilters,
  ReturnWithRelations,
  TitleForReturnSelect,
} from "./types";

/**
 * Search titles for returns form autocomplete
 *
 * AC 2: Shows only titles with at least one format available (has ISBN or eISBN assigned)
 * AC 3: Returns has_isbn/has_eisbn flags for format dropdown filtering
 *
 * @param searchTerm - Search query (matches title or author name)
 * @param limit - Maximum results to return (default 10)
 * @returns Array of titles with ISBN availability info
 *
 * Query pattern:
 * - Tenant-scoped (WHERE tenant_id = ?)
 * - Filters to titles with isbn OR eisbn assigned
 * - Searches title and author name
 * - Joins authors table for author_name
 */
export async function searchTitlesForReturns(
  searchTerm: string,
  limit: number = 10,
): Promise<TitleForReturnSelect[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Trim and prepare search term
  const search = searchTerm.trim();
  if (!search) {
    return [];
  }

  const searchPattern = `%${search}%`;

  // Query titles with ISBN assigned
  // Join with authors for author_name
  // Story 7.6: Simplified - check for single isbn field (no type distinction)
  const results = await db
    .select({
      id: titles.id,
      title: titles.title,
      author_name: authors.name,
      isbn: titles.isbn,
    })
    .from(titles)
    .innerJoin(authors, eq(titles.author_id, authors.id))
    .where(
      and(
        // Tenant isolation
        eq(titles.tenant_id, tenantId),
        // Story 7.6: Must have ISBN assigned (unified, no type distinction)
        isNotNull(titles.isbn),
        // Search in title or author name
        or(
          ilike(titles.title, searchPattern),
          ilike(authors.name, searchPattern),
        ),
      ),
    )
    .limit(limit);

  // Transform to TitleForReturnSelect with boolean flags
  // Story 7.6: Removed has_eisbn - ISBNs are unified without type distinction
  return results.map((row) => ({
    id: row.id,
    title: row.title,
    author_name: row.author_name,
    has_isbn: row.isbn !== null,
  }));
}

/**
 * Get a single title by ID for returns validation
 *
 * Used by recordReturn action to validate title_id exists and has ISBN
 *
 * @param titleId - Title UUID
 * @returns Title with ISBN info or null if not found
 */
export async function getTitleForReturn(
  titleId: string,
): Promise<TitleForReturnSelect | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Story 7.6: Simplified - check for single isbn field (no type distinction)
  const results = await db
    .select({
      id: titles.id,
      title: titles.title,
      author_name: authors.name,
      isbn: titles.isbn,
    })
    .from(titles)
    .innerJoin(authors, eq(titles.author_id, authors.id))
    .where(
      and(
        eq(titles.tenant_id, tenantId),
        eq(titles.id, titleId),
        // Story 7.6: Must have ISBN assigned (unified, no type distinction)
        isNotNull(titles.isbn),
      ),
    )
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const row = results[0];
  // Story 7.6: Removed has_eisbn - ISBNs are unified without type distinction
  return {
    id: row.id,
    title: row.title,
    author_name: row.author_name,
    has_isbn: row.isbn !== null,
  };
}

/**
 * Get tenant timezone for date display
 *
 * AC 6: "Formatted display in tenant timezone"
 * Any authenticated user can retrieve their tenant's timezone.
 *
 * @returns Tenant timezone string (e.g., "America/New_York") or default
 */
export async function getTenantTimezone(): Promise<string> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const result = await db
    .select({ timezone: tenants.timezone })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  return result[0]?.timezone ?? "America/New_York";
}

/**
 * Get returns history with filtering, sorting, and pagination
 *
 * Story 3.7: Returns History View with Status Filtering
 * AC 2: Table columns
 * AC 3-6: Filters (status, date range, search, format)
 * AC 7: Sorting
 * AC 8: Pagination
 *
 * @param filters - Filter, sort, and pagination parameters
 * @returns Paginated returns with related data
 */
export async function getReturnsHistory(
  filters: ReturnsHistoryFilters = {},
): Promise<PaginatedReturns> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Build WHERE conditions
  const conditions = [eq(returns.tenant_id, tenantId)];

  // Status filter (AC 3)
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(returns.status, filters.status));
  }

  // Date range filter (AC 4)
  if (filters.from_date) {
    conditions.push(gte(returns.return_date, filters.from_date));
  }
  if (filters.to_date) {
    conditions.push(lte(returns.return_date, filters.to_date));
  }

  // Format filter (AC 6)
  if (filters.format && filters.format !== "all") {
    conditions.push(eq(returns.format, filters.format));
  }

  // Title search filter (AC 5) - searches title name
  // Handled via subquery below

  // Pagination defaults (AC 8)
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  // Build order clause (AC 7)
  const sortOrder = filters.order === "asc" ? asc : desc;
  let orderClause: ReturnType<typeof asc>;
  switch (filters.sort) {
    case "amount":
      orderClause = sortOrder(returns.total_amount);
      break;
    case "status":
      orderClause = sortOrder(returns.status);
      break;
    default:
      orderClause = sortOrder(returns.return_date);
      break;
  }

  // Note: Users table doesn't have a name column - we use email prefix as display name

  // Build the main query with search
  let whereClause = and(...conditions);

  // If search filter is provided, add title name search
  if (filters.search?.trim()) {
    const searchPattern = `%${filters.search.trim()}%`;
    // Get title IDs that match the search
    const matchingTitles = await db
      .select({ id: titles.id })
      .from(titles)
      .where(
        and(eq(titles.tenant_id, tenantId), ilike(titles.title, searchPattern)),
      );

    if (matchingTitles.length > 0) {
      const titleIds = matchingTitles.map((t) => t.id);
      // Use sql.raw for IN clause with the title IDs
      conditions.push(
        sql`${returns.title_id} IN (${sql.join(
          titleIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
      whereClause = and(...conditions);
    } else {
      // No matching titles, return empty result
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  // Get total count for pagination
  const countResult = await db
    .select({ count: count() })
    .from(returns)
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Get paginated results with joins
  const results = await db
    .select({
      id: returns.id,
      return_date: returns.return_date,
      format: returns.format,
      quantity: returns.quantity,
      unit_price: returns.unit_price,
      total_amount: returns.total_amount,
      reason: returns.reason,
      status: returns.status,
      reviewed_at: returns.reviewed_at,
      created_at: returns.created_at,
      title_id: titles.id,
      title_name: titles.title,
      author_name: authors.name,
      created_by_email: users.email,
      reviewed_by_id: returns.reviewed_by_user_id,
    })
    .from(returns)
    .innerJoin(titles, eq(returns.title_id, titles.id))
    .innerJoin(authors, eq(titles.author_id, authors.id))
    .innerJoin(users, eq(returns.created_by_user_id, users.id))
    .where(whereClause)
    .orderBy(orderClause)
    .limit(pageSize)
    .offset(offset);

  // Get reviewer emails for results that have reviewed_by_user_id
  const reviewerIds = results
    .filter((r) => r.reviewed_by_id)
    .map((r) => r.reviewed_by_id as string);

  let reviewerMap: Map<string, string> = new Map();
  if (reviewerIds.length > 0) {
    const reviewers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(
        sql`${users.id} IN (${sql.join(
          reviewerIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
    // Use email prefix as display name
    reviewerMap = new Map(reviewers.map((r) => [r.id, r.email.split("@")[0]]));
  }

  // Transform results to ReturnWithRelations
  const items: ReturnWithRelations[] = results.map((row) => ({
    id: row.id,
    return_date: row.return_date,
    format: row.format as "physical" | "ebook" | "audiobook",
    quantity: row.quantity,
    unit_price: row.unit_price,
    total_amount: row.total_amount,
    reason: row.reason,
    status: row.status as "pending" | "approved" | "rejected",
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    title: {
      id: row.title_id,
      title: row.title_name,
      author_name: row.author_name,
    },
    createdBy: {
      name: row.created_by_email.split("@")[0], // Use email prefix as display name
    },
    reviewedBy: row.reviewed_by_id
      ? { name: reviewerMap.get(row.reviewed_by_id) ?? "Unknown" }
      : null,
    originalSale: null, // Not loading original sale for history view
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Get a single return by ID with full relations
 *
 * Story 3.7: Return Detail Page (AC 10)
 * Used for /returns/[id] detail view
 *
 * @param returnId - Return UUID
 * @returns Return with relations or null if not found
 */
export async function getReturnById(
  returnId: string,
): Promise<ReturnWithRelations | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const results = await db
    .select({
      id: returns.id,
      return_date: returns.return_date,
      format: returns.format,
      quantity: returns.quantity,
      unit_price: returns.unit_price,
      total_amount: returns.total_amount,
      reason: returns.reason,
      status: returns.status,
      reviewed_at: returns.reviewed_at,
      created_at: returns.created_at,
      title_id: titles.id,
      title_name: titles.title,
      author_name: authors.name,
      created_by_email: users.email,
      reviewed_by_id: returns.reviewed_by_user_id,
      original_sale_id: returns.original_sale_id,
    })
    .from(returns)
    .innerJoin(titles, eq(returns.title_id, titles.id))
    .innerJoin(authors, eq(titles.author_id, authors.id))
    .innerJoin(users, eq(returns.created_by_user_id, users.id))
    .where(and(eq(returns.tenant_id, tenantId), eq(returns.id, returnId)))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const row = results[0];

  // Get reviewer email if exists (use email prefix as display name)
  let reviewerName: string | null = null;
  if (row.reviewed_by_id) {
    const reviewer = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, row.reviewed_by_id))
      .limit(1);
    reviewerName = reviewer[0]?.email.split("@")[0] ?? null;
  }

  return {
    id: row.id,
    return_date: row.return_date,
    format: row.format as "physical" | "ebook" | "audiobook",
    quantity: row.quantity,
    unit_price: row.unit_price,
    total_amount: row.total_amount,
    reason: row.reason,
    status: row.status as "pending" | "approved" | "rejected",
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    title: {
      id: row.title_id,
      title: row.title_name,
      author_name: row.author_name,
    },
    createdBy: {
      name: row.created_by_email.split("@")[0], // Use email prefix as display name
    },
    reviewedBy: reviewerName ? { name: reviewerName } : null,
    originalSale: row.original_sale_id
      ? { id: row.original_sale_id, sale_date: "" }
      : null,
  };
}

/**
 * Get all pending returns for approval queue
 *
 * Story 3.6: AC 2 (left panel displays pending returns queue)
 * Returns sorted by created_at ASC (oldest first - FIFO for fair processing)
 *
 * @returns Array of pending returns with title and creator info
 */
export async function getPendingReturns(): Promise<PendingReturn[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const results = await db
    .select({
      id: returns.id,
      return_date: returns.return_date,
      format: returns.format,
      quantity: returns.quantity,
      unit_price: returns.unit_price,
      total_amount: returns.total_amount,
      reason: returns.reason,
      created_at: returns.created_at,
      title_id: titles.id,
      title_name: titles.title,
      author_name: authors.name,
      created_by_email: users.email,
    })
    .from(returns)
    .innerJoin(titles, eq(returns.title_id, titles.id))
    .innerJoin(authors, eq(titles.author_id, authors.id))
    .innerJoin(users, eq(returns.created_by_user_id, users.id))
    .where(and(eq(returns.tenant_id, tenantId), eq(returns.status, "pending")))
    .orderBy(asc(returns.created_at)); // FIFO - oldest first

  return results.map((row) => ({
    id: row.id,
    return_date: row.return_date,
    format: row.format as "physical" | "ebook" | "audiobook",
    quantity: row.quantity,
    unit_price: row.unit_price,
    total_amount: row.total_amount,
    reason: row.reason,
    created_at: row.created_at,
    title: {
      id: row.title_id,
      title: row.title_name,
      author_name: row.author_name,
    },
    createdBy: {
      name: row.created_by_email.split("@")[0], // Use email prefix as display name
    },
  }));
}

/**
 * Get count of pending returns for navigation badge
 *
 * Story 3.6: AC 10 (dashboard badge), AC 1 (page header count)
 *
 * @returns Number of pending returns
 */
export async function getPendingReturnsCount(): Promise<number> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const result = await db
    .select({ count: count() })
    .from(returns)
    .where(and(eq(returns.tenant_id, tenantId), eq(returns.status, "pending")));

  return result[0]?.count ?? 0;
}

/**
 * Get pending returns summary for dashboard card
 *
 * Story 3.6: AC 10 (Finance dashboard card with count and total value)
 *
 * @returns Summary with count, total value, and oldest pending date
 */
export async function getPendingReturnsSummary(): Promise<ApprovalQueueSummary> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const result = await db
    .select({
      count: count(),
      total: sum(returns.total_amount),
      oldest: min(returns.created_at),
    })
    .from(returns)
    .where(and(eq(returns.tenant_id, tenantId), eq(returns.status, "pending")));

  const row = result[0];
  return {
    pendingCount: row?.count ?? 0,
    pendingTotal: row?.total ?? "0.00",
    oldestPendingDate: row?.oldest ?? null,
  };
}

/**
 * Get a single pending return by ID for approval detail panel
 *
 * Story 3.6: AC 3 (right panel return detail)
 * Only returns pending returns for approval workflow
 *
 * @param returnId - Return UUID
 * @returns Pending return with relations or null if not found/not pending
 */
export async function getPendingReturnById(
  returnId: string,
): Promise<PendingReturn | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const results = await db
    .select({
      id: returns.id,
      return_date: returns.return_date,
      format: returns.format,
      quantity: returns.quantity,
      unit_price: returns.unit_price,
      total_amount: returns.total_amount,
      reason: returns.reason,
      created_at: returns.created_at,
      title_id: titles.id,
      title_name: titles.title,
      author_name: authors.name,
      created_by_email: users.email,
    })
    .from(returns)
    .innerJoin(titles, eq(returns.title_id, titles.id))
    .innerJoin(authors, eq(titles.author_id, authors.id))
    .innerJoin(users, eq(returns.created_by_user_id, users.id))
    .where(
      and(
        eq(returns.tenant_id, tenantId),
        eq(returns.id, returnId),
        eq(returns.status, "pending"),
      ),
    )
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const row = results[0];
  return {
    id: row.id,
    return_date: row.return_date,
    format: row.format as "physical" | "ebook" | "audiobook",
    quantity: row.quantity,
    unit_price: row.unit_price,
    total_amount: row.total_amount,
    reason: row.reason,
    created_at: row.created_at,
    title: {
      id: row.title_id,
      title: row.title_name,
      author_name: row.author_name,
    },
    createdBy: {
      name: row.created_by_email.split("@")[0],
    },
  };
}
