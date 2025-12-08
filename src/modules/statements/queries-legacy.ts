"use server";

/**
 * Statement Query Functions
 *
 * Read-only query functions for statements list and detail views.
 * All queries enforce tenant isolation via getDb() authenticated connection.
 *
 * Story: 5.5 - Build Statements List and Detail View for Finance
 * AC-5.5.1: Table displays period, author, generated on date, status badge, net payable, and actions
 * AC-5.5.2: Filters available: Period (dropdown), Author (search), Status (All/Sent/Draft/Failed), Date range
 * AC-5.5.3: Detail modal shows full calculation breakdown
 *
 * Related:
 * - src/modules/statements/types.ts (StatementWithRelations, PaginatedStatements)
 * - src/db/schema/statements.ts (statements table)
 * - src/lib/auth.ts (getDb, requirePermission)
 */

import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  ne,
  sql,
  sum,
} from "drizzle-orm";
import { authors } from "@/db/schema/authors";
import { statements } from "@/db/schema/statements";
import { getCurrentUser, getDb, requirePermission } from "@/lib/auth";
import type {
  PaginatedStatements,
  StatementWithDetails,
  StatementWithRelations,
} from "./types";

/**
 * Filter parameters for statements list query
 * AC-5.5.2: Filters available
 */
export interface StatementsFilter {
  /** Filter by period start date (optional) */
  periodStart?: Date;
  /** Filter by period end date (optional) */
  periodEnd?: Date;
  /** Filter by specific author ID (optional) */
  authorId?: string;
  /** Search author by name (case-insensitive, optional) */
  authorSearch?: string;
  /** Filter by statement status (optional) */
  status?: "draft" | "sent" | "failed";
  /** Filter by generation date - after (inclusive) */
  generatedAfter?: Date;
  /** Filter by generation date - before (inclusive) */
  generatedBefore?: Date;
}

/**
 * Get paginated list of statements with filters
 *
 * AC-5.5.1: Returns statements with period, author, status, net_payable
 * AC-5.5.2: Supports filtering by period, author, status, date range
 *
 * Required roles: finance, admin, owner
 *
 * @param params.page - Page number (1-indexed, default: 1)
 * @param params.pageSize - Items per page (default: 20)
 * @param params.filters - Optional filter criteria
 * @returns Paginated statements with author and contract relations
 */
export async function getStatements(params: {
  page?: number;
  pageSize?: number;
  filters?: StatementsFilter;
}): Promise<PaginatedStatements> {
  // AC-5.5.1: Only Finance, Admin, Owner can view all statements
  await requirePermission(["finance", "admin", "owner"]);
  const db = await getDb();

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  // Build filter conditions
  const conditions: ReturnType<typeof eq>[] = [];

  // Period filters
  if (params.filters?.periodStart) {
    conditions.push(gte(statements.period_start, params.filters.periodStart));
  }
  if (params.filters?.periodEnd) {
    conditions.push(lte(statements.period_end, params.filters.periodEnd));
  }

  // Author ID filter
  if (params.filters?.authorId) {
    conditions.push(eq(statements.author_id, params.filters.authorId));
  }

  // Status filter
  if (params.filters?.status) {
    conditions.push(eq(statements.status, params.filters.status));
  }

  // Generated date range filters
  if (params.filters?.generatedAfter) {
    conditions.push(gte(statements.created_at, params.filters.generatedAfter));
  }
  if (params.filters?.generatedBefore) {
    conditions.push(lte(statements.created_at, params.filters.generatedBefore));
  }

  // For author search, we need a subquery approach
  let authorIds: string[] | undefined;
  if (params.filters?.authorSearch) {
    const matchingAuthors = await db.query.authors.findMany({
      where: ilike(authors.name, `%${params.filters.authorSearch}%`),
      columns: { id: true },
    });
    authorIds = matchingAuthors.map((a) => a.id);

    // If no matching authors, return empty result
    if (authorIds.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    // Use IN clause for matching author IDs
    conditions.push(
      sql`${statements.author_id} IN (${sql.join(
        authorIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }

  // Get total count
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: count() })
    .from(statements)
    .where(whereClause);
  const total = countResult[0]?.count || 0;

  // Get paginated items with relations
  const items = await db.query.statements.findMany({
    where: whereClause,
    with: {
      author: true,
      contract: true,
    },
    limit: pageSize,
    offset,
    orderBy: desc(statements.created_at),
  });

  return {
    items: items as StatementWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get statement by ID with full details for detail modal
 *
 * AC-5.5.3: Detail modal shows full calculation breakdown
 *
 * Required roles: finance, admin, owner
 *
 * @param statementId - UUID of the statement
 * @returns Statement with author, contract, and title details
 */
export async function getStatementById(
  statementId: string,
): Promise<StatementWithDetails | null> {
  // AC-5.5.3: Only Finance, Admin, Owner can view statement details
  await requirePermission(["finance", "admin", "owner"]);
  const db = await getDb();

  // Get statement with relations
  const statement = await db.query.statements.findFirst({
    where: eq(statements.id, statementId),
    with: {
      author: true,
      contract: {
        with: {
          title: true,
        },
      },
    },
  });

  if (!statement) {
    return null;
  }

  // Transform to StatementWithDetails
  // Note: This file is legacy and not used - author nullability handled with fallbacks
  return {
    ...statement,
    author: {
      id: statement.author?.id ?? "",
      name: statement.author?.name ?? "Unknown",
      address: statement.author?.address ?? null,
      email: statement.author?.email ?? null,
    },
    contract: {
      id: statement.contract.id,
      title_id: statement.contract.title_id,
    },
    title: {
      id: statement.contract.title.id,
      title: statement.contract.title.title,
    },
  } as StatementWithDetails;
}

/**
 * Get unique periods from existing statements for filter dropdown
 *
 * AC-5.5.2: Period filter dropdown populated from unique periods
 *
 * Required roles: finance, admin, owner
 *
 * @returns Array of unique period objects with start and end dates
 */
export async function getUniquePeriods(): Promise<
  Array<{ periodStart: Date; periodEnd: Date; label: string }>
> {
  await requirePermission(["finance", "admin", "owner"]);
  const db = await getDb();

  // Get distinct period combinations
  const periods = await db
    .selectDistinct({
      periodStart: statements.period_start,
      periodEnd: statements.period_end,
    })
    .from(statements)
    .orderBy(desc(statements.period_start));

  // Format as quarter labels
  return periods.map((p) => {
    const start = new Date(p.periodStart);
    const quarter = Math.ceil((start.getMonth() + 1) / 3);
    const year = start.getFullYear();
    return {
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      label: `Q${quarter} ${year}`,
    };
  });
}

/**
 * Statistics for statements dashboard
 */
export interface StatementStats {
  /** Count of statements generated this quarter */
  thisQuarterCount: number;
  /** Sum of net_payable for statements this quarter */
  totalLiability: number;
  /** Count of statements with status != 'sent' */
  pendingEmailCount: number;
}

/**
 * Get statement statistics for dashboard cards
 *
 * AC-5.5.1: Stats cards at top of page
 * - Statements Generated This Quarter
 * - Total Liability (sum of net_payable)
 * - Pending Emails
 *
 * Required roles: finance, admin, owner
 *
 * @returns Statement statistics object
 */
export async function getStatementStats(): Promise<StatementStats> {
  await requirePermission(["finance", "admin", "owner"]);
  const db = await getDb();

  // Calculate current quarter boundaries
  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const quarterStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
  const quarterEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);

  // This quarter count
  const quarterCountResult = await db
    .select({ count: count() })
    .from(statements)
    .where(
      and(
        gte(statements.created_at, quarterStart),
        lte(statements.created_at, quarterEnd),
      ),
    );
  const thisQuarterCount = quarterCountResult[0]?.count || 0;

  // Total liability (sum of net_payable for current quarter)
  const liabilityResult = await db
    .select({ total: sum(statements.net_payable) })
    .from(statements)
    .where(
      and(
        gte(statements.created_at, quarterStart),
        lte(statements.created_at, quarterEnd),
      ),
    );
  const totalLiability = Number(liabilityResult[0]?.total) || 0;

  // Pending emails (not sent)
  const pendingResult = await db
    .select({ count: count() })
    .from(statements)
    .where(ne(statements.status, "sent"));
  const pendingEmailCount = pendingResult[0]?.count || 0;

  return {
    thisQuarterCount,
    totalLiability,
    pendingEmailCount,
  };
}

/**
 * Search authors for filter autocomplete
 *
 * AC-5.5.2: Author search filter with autocomplete
 *
 * Required roles: finance, admin, owner
 *
 * @param searchQuery - Search string to match against author name
 * @returns Array of matching authors with id and name
 */
export async function searchAuthorsForFilter(
  searchQuery: string,
): Promise<Array<{ id: string; name: string }>> {
  await requirePermission(["finance", "admin", "owner"]);
  const db = await getDb();

  // Only search if query has at least 2 characters
  if (searchQuery.length < 2) {
    return [];
  }

  const matchingAuthors = await db.query.authors.findMany({
    where: ilike(authors.name, `%${searchQuery}%`),
    columns: { id: true, name: true },
    limit: 10,
  });

  return matchingAuthors;
}

/**
 * Combined page data for statements page
 * Single auth check, fetches all data needed for initial page load
 */
export interface StatementsPageData {
  statements: PaginatedStatements;
  stats: StatementStats;
  periods: Array<{ periodStart: Date; periodEnd: Date; label: string }>;
}

/**
 * Get all data needed for statements page in a single server action
 *
 * This combines getStatements, getStatementStats, and getUniquePeriods
 * to reduce Clerk API calls from 9+ to 3.
 *
 * Required roles: finance, admin, owner
 *
 * @param params.page - Page number (1-indexed, default: 1)
 * @param params.pageSize - Items per page (default: 20)
 * @param params.filters - Optional filter criteria
 * @returns Combined page data with statements, stats, and periods
 */
export async function getStatementsPageData(params: {
  page?: number;
  pageSize?: number;
  filters?: StatementsFilter;
}): Promise<StatementsPageData> {
  // Single permission check for all data
  await requirePermission(["finance", "admin", "owner"]);
  const db = await getDb();

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  // ============ Fetch Statements ============
  // Build filter conditions
  const conditions: ReturnType<typeof eq>[] = [];

  if (params.filters?.periodStart) {
    conditions.push(gte(statements.period_start, params.filters.periodStart));
  }
  if (params.filters?.periodEnd) {
    conditions.push(lte(statements.period_end, params.filters.periodEnd));
  }
  if (params.filters?.authorId) {
    conditions.push(eq(statements.author_id, params.filters.authorId));
  }
  if (params.filters?.status) {
    conditions.push(eq(statements.status, params.filters.status));
  }
  if (params.filters?.generatedAfter) {
    conditions.push(gte(statements.created_at, params.filters.generatedAfter));
  }
  if (params.filters?.generatedBefore) {
    conditions.push(lte(statements.created_at, params.filters.generatedBefore));
  }

  // Author search
  let authorIds: string[] | undefined;
  if (params.filters?.authorSearch) {
    const matchingAuthors = await db.query.authors.findMany({
      where: ilike(authors.name, `%${params.filters.authorSearch}%`),
      columns: { id: true },
    });
    authorIds = matchingAuthors.map((a) => a.id);

    if (authorIds.length === 0) {
      // No matching authors - return empty statements but still fetch stats/periods
      const [stats, periods] = await Promise.all([
        fetchStatsInternal(db),
        fetchPeriodsInternal(db),
      ]);
      return {
        statements: { items: [], total: 0, page, pageSize, totalPages: 0 },
        stats,
        periods,
      };
    }

    conditions.push(
      sql`${statements.author_id} IN (${sql.join(
        authorIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Parallel fetch: statements count, statements items, stats, periods
  const [countResult, items, stats, periods] = await Promise.all([
    db.select({ count: count() }).from(statements).where(whereClause),
    db.query.statements.findMany({
      where: whereClause,
      with: { author: true, contract: true },
      limit: pageSize,
      offset,
      orderBy: desc(statements.created_at),
    }),
    fetchStatsInternal(db),
    fetchPeriodsInternal(db),
  ]);

  const total = countResult[0]?.count || 0;

  return {
    statements: {
      items: items as StatementWithRelations[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    stats,
    periods,
  };
}

/**
 * Internal helper for stats (no permission check - called after main check)
 */
async function fetchStatsInternal(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<StatementStats> {
  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const quarterStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
  const quarterEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);

  const [quarterCountResult, liabilityResult, pendingResult] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(statements)
        .where(
          and(
            gte(statements.created_at, quarterStart),
            lte(statements.created_at, quarterEnd),
          ),
        ),
      db
        .select({ total: sum(statements.net_payable) })
        .from(statements)
        .where(
          and(
            gte(statements.created_at, quarterStart),
            lte(statements.created_at, quarterEnd),
          ),
        ),
      db
        .select({ count: count() })
        .from(statements)
        .where(ne(statements.status, "sent")),
    ]);

  return {
    thisQuarterCount: quarterCountResult[0]?.count || 0,
    totalLiability: Number(liabilityResult[0]?.total) || 0,
    pendingEmailCount: pendingResult[0]?.count || 0,
  };
}

/**
 * Internal helper for periods (no permission check - called after main check)
 */
async function fetchPeriodsInternal(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<Array<{ periodStart: Date; periodEnd: Date; label: string }>> {
  const periods = await db
    .selectDistinct({
      periodStart: statements.period_start,
      periodEnd: statements.period_end,
    })
    .from(statements)
    .orderBy(desc(statements.period_start));

  return periods.map((p) => {
    const start = new Date(p.periodStart);
    const quarter = Math.ceil((start.getMonth() + 1) / 3);
    const year = start.getFullYear();
    return {
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      label: `Q${quarter} ${year}`,
    };
  });
}

// ============================================================================
// Portal Queries (Story 5.6)
// ============================================================================

/**
 * Get author's own statements for portal view
 *
 * AC-5.6.2: Statement list shows only author's own statements
 * AC-5.6.5: RLS prevents access to other authors' data
 *
 * Required role: author (portal user)
 *
 * @returns Array of statements for the authenticated author, sorted by date (newest first)
 */
export async function getMyStatements(): Promise<StatementWithRelations[]> {
  const db = await getDb();
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  // Find author linked to this portal user via portal_user_id
  const author = await db.query.authors.findFirst({
    where: and(
      eq(authors.portal_user_id, user.id),
      eq(authors.is_active, true),
    ),
  });

  if (!author) {
    // User is not linked to any author - return empty
    return [];
  }

  // Get statements for this author only
  const items = await db.query.statements.findMany({
    where: eq(statements.author_id, author.id),
    with: {
      author: true,
      contract: true,
    },
    orderBy: desc(statements.created_at),
  });

  return items as StatementWithRelations[];
}

/**
 * Get single statement by ID for portal detail view with author ownership check
 *
 * AC-5.6.3: Statement detail view matches PDF content structure
 * AC-5.6.5: RLS prevents access to other authors' data
 *
 * Required role: author (portal user)
 *
 * @param statementId - UUID of the statement
 * @returns Statement with details if owned by current author, null otherwise
 */
export async function getMyStatementById(
  statementId: string,
): Promise<StatementWithDetails | null> {
  const db = await getDb();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  // Find author linked to this portal user
  const author = await db.query.authors.findFirst({
    where: and(
      eq(authors.portal_user_id, user.id),
      eq(authors.is_active, true),
    ),
  });

  if (!author) {
    return null;
  }

  // Get statement with ownership check via author_id
  const statement = await db.query.statements.findFirst({
    where: and(
      eq(statements.id, statementId),
      eq(statements.author_id, author.id),
    ),
    with: {
      author: true,
      contract: {
        with: {
          title: true,
        },
      },
    },
  });

  if (!statement) {
    return null;
  }

  // Transform to StatementWithDetails
  // Note: This file is legacy and not used - author nullability handled with fallbacks
  return {
    ...statement,
    author: {
      id: statement.author?.id ?? "",
      name: statement.author?.name ?? "Unknown",
      address: statement.author?.address ?? null,
      email: statement.author?.email ?? null,
    },
    contract: {
      id: statement.contract.id,
      title_id: statement.contract.title_id,
    },
    title: {
      id: statement.contract.title.id,
      title: statement.contract.title.title,
    },
  } as StatementWithDetails;
}
