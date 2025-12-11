"use server";

/**
 * Statement Query Functions (Contact-Based)
 *
 * Story 7.3: Migrate Authors to Contacts
 *
 * Read-only query functions for statements list and detail views.
 * Authors are now queried from the contacts table with role='author'.
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
 * - queries-legacy.ts (original authors table implementation)
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
  or,
  sql,
  sum,
} from "drizzle-orm";
import { contacts } from "@/db/schema/contacts";
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
  // Search contacts with author role by first_name/last_name
  let authorIds: string[] | undefined;
  if (params.filters?.authorSearch) {
    const searchTerm = `%${params.filters.authorSearch}%`;
    const matchingContacts = await db.query.contacts.findMany({
      where: or(
        ilike(contacts.first_name, searchTerm),
        ilike(contacts.last_name, searchTerm),
      ),
      columns: { id: true },
      with: { roles: true },
    });

    // Filter to only contacts with author role
    authorIds = matchingContacts
      .filter((c) => c.roles.some((r) => r.role === "author"))
      .map((a) => a.id);

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

    // Use IN clause for matching author IDs (now contact IDs)
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
  // Story 7.3: Load both author (legacy) and contact (new) relations
  const items = await db.query.statements.findMany({
    where: whereClause,
    with: {
      author: true,
      contact: true,
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
  // Story 7.3: Load both author (legacy) and contact (new) relations
  const statement = await db.query.statements.findFirst({
    where: eq(statements.id, statementId),
    with: {
      author: true,
      contact: true,
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

  // Story 7.3: Build author info from contact (new) or author (legacy)
  let authorInfo: {
    id: string;
    name: string;
    address: string | null;
    email: string | null;
  };

  if (statement.contact) {
    // New statement with contact relation
    const firstName = statement.contact.first_name || "";
    const lastName = statement.contact.last_name || "";
    const contactAddress = [
      statement.contact.address_line1,
      statement.contact.address_line2,
      [
        statement.contact.city,
        statement.contact.state,
        statement.contact.postal_code,
      ]
        .filter(Boolean)
        .join(" "),
      statement.contact.country,
    ]
      .filter(Boolean)
      .join(", ");

    authorInfo = {
      id: statement.contact.id,
      name: `${firstName} ${lastName}`.trim() || "Unknown",
      address: contactAddress || null,
      email: statement.contact.email,
    };
  } else if (statement.author) {
    // Legacy statement with author relation
    authorInfo = {
      id: statement.author.id,
      name: statement.author.name,
      address: statement.author.address,
      email: statement.author.email,
    };
  } else {
    // No author or contact - use placeholder
    authorInfo = {
      id: "",
      name: "Unknown",
      address: null,
      email: null,
    };
  }

  // Transform to StatementWithDetails
  return {
    ...statement,
    author: authorInfo,
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
 * Story 7.3: Now searches contacts with author role
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

  const searchTerm = `%${searchQuery}%`;
  const matchingContacts = await db.query.contacts.findMany({
    where: or(
      ilike(contacts.first_name, searchTerm),
      ilike(contacts.last_name, searchTerm),
    ),
    columns: { id: true, first_name: true, last_name: true },
    with: { roles: true },
    limit: 20, // Get more to filter
  });

  // Filter to contacts with author role and map to expected format
  return matchingContacts
    .filter((c) => c.roles.some((r) => r.role === "author"))
    .slice(0, 10) // Limit after filtering
    .map((c) => ({
      id: c.id,
      name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown",
    }));
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

  // Author search - now using contacts with author role (Story 7.3)
  let authorIds: string[] | undefined;
  if (params.filters?.authorSearch) {
    const searchTerm = `%${params.filters.authorSearch}%`;
    const matchingContacts = await db.query.contacts.findMany({
      where: or(
        ilike(contacts.first_name, searchTerm),
        ilike(contacts.last_name, searchTerm),
      ),
      columns: { id: true },
      with: { roles: true },
    });

    // Filter to only contacts with author role
    authorIds = matchingContacts
      .filter((c) => c.roles.some((r) => r.role === "author"))
      .map((a) => a.id);

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
  // Story 7.3: Load both author (legacy) and contact (new) relations
  const [countResult, items, stats, periods] = await Promise.all([
    db.select({ count: count() }).from(statements).where(whereClause),
    db.query.statements.findMany({
      where: whereClause,
      with: { author: true, contact: true, contract: true },
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
 * Story 7.3: Migrated to use contacts table with author role
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

  // Find contact with author role linked to this portal user (Story 7.3)
  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.portal_user_id, user.id),
      eq(contacts.status, "active"),
    ),
    with: { roles: true },
  });

  // Verify contact exists and has author role
  if (!contact || !contact.roles.some((r) => r.role === "author")) {
    return [];
  }

  // Get statements for this author using contact_id (Story 7.3 migration)
  const items = await db.query.statements.findMany({
    where: eq(statements.contact_id, contact.id),
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
 * Story 7.3: Migrated to use contacts table with author role
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

  // Find contact with author role linked to this portal user (Story 7.3)
  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.portal_user_id, user.id),
      eq(contacts.status, "active"),
    ),
    with: { roles: true },
  });

  // Verify contact exists and has author role
  if (!contact || !contact.roles.some((r) => r.role === "author")) {
    return null;
  }

  // Get statement with ownership check via contact_id (Story 7.3 migration)
  const statement = await db.query.statements.findFirst({
    where: and(
      eq(statements.id, statementId),
      eq(statements.contact_id, contact.id),
    ),
    with: {
      author: true,
      contact: true,
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

  // Story 7.3: Build author info from the current portal user's contact data
  // For portal statements, we use the contact data since they're accessed via contact_id
  const contactAddress = [
    contact.address_line1,
    contact.address_line2,
    [contact.city, contact.state, contact.postal_code]
      .filter(Boolean)
      .join(" "),
    contact.country,
  ]
    .filter(Boolean)
    .join(", ");

  const authorInfo = {
    id: contact.id,
    name:
      `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
      "Unknown",
    address: contactAddress || null,
    email: contact.email,
  };

  // Transform to StatementWithDetails
  return {
    ...statement,
    author: authorInfo,
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
