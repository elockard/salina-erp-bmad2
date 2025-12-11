"use server";

/**
 * Sales Module Queries
 *
 * Database queries for sales transaction management.
 * Provides title search for sales form autocomplete.
 *
 * Story 3.2: Build Sales Transaction Entry Form
 * Related ACs: 2 (title autocomplete), 3 (format dropdown), 6 (tenant timezone)
 *
 * Story 3.3: Build Sales Transaction History View
 * Related ACs: 2 (stats), 3 (table), 4 (filters), 5 (pagination)
 *
 * CONSTRAINT: Only titles with at least one ISBN assigned are returned
 */

import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  lte,
  or,
  sum,
} from "drizzle-orm";
import { contacts } from "@/db/schema/contacts";
import { sales } from "@/db/schema/sales";
import { tenants } from "@/db/schema/tenants";
import { titles } from "@/db/schema/titles";
import { users } from "@/db/schema/users";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import type { SalesFilterInput } from "./schema";
import type {
  PaginatedSales,
  SalesStats,
  SaleWithRelations,
  TitleForSalesSelect,
} from "./types";

/**
 * Search titles for sales form autocomplete
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
export async function searchTitlesForSales(
  searchTerm: string,
  limit: number = 10,
): Promise<TitleForSalesSelect[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Trim and prepare search term
  const search = searchTerm.trim();
  if (!search) {
    return [];
  }

  const searchPattern = `%${search}%`;

  // Query titles with at least one ISBN assigned
  // Story 7.3: Join with contacts (not authors) for author_name
  const results = await db
    .select({
      id: titles.id,
      title: titles.title,
      first_name: contacts.first_name,
      last_name: contacts.last_name,
      isbn: titles.isbn,
    })
    .from(titles)
    .leftJoin(contacts, eq(titles.contact_id, contacts.id))
    .where(
      and(
        // Tenant isolation
        eq(titles.tenant_id, tenantId),
        // Story 7.6: Must have ISBN assigned (unified, no type distinction)
        isNotNull(titles.isbn),
        // Search in title or author name
        or(
          ilike(titles.title, searchPattern),
          ilike(contacts.first_name, searchPattern),
          ilike(contacts.last_name, searchPattern),
        ),
      ),
    )
    .limit(limit);

  // Transform to TitleForSalesSelect with boolean flags
  // Story 7.6: Removed has_eisbn - ISBNs are unified without type distinction
  return results.map((row) => ({
    id: row.id,
    title: row.title,
    author_name:
      row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`.trim()
        : row.first_name || row.last_name || "Unknown Author",
    has_isbn: row.isbn !== null,
  }));
}

/**
 * Get a single title by ID for sales validation
 *
 * Used by recordSale action to validate title_id exists and has ISBN
 *
 * @param titleId - Title UUID
 * @returns Title with ISBN info or null if not found
 */
export async function getTitleForSale(
  titleId: string,
): Promise<TitleForSalesSelect | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Story 7.3: Use contacts (not authors) for author info
  const results = await db
    .select({
      id: titles.id,
      title: titles.title,
      first_name: contacts.first_name,
      last_name: contacts.last_name,
      isbn: titles.isbn,
    })
    .from(titles)
    .leftJoin(contacts, eq(titles.contact_id, contacts.id))
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
    author_name:
      row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`.trim()
        : row.first_name || row.last_name || "Unknown Author",
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
 * Get sales with filters and pagination
 *
 * Story 3.3: AC 3 (table), AC 4 (filters), AC 5 (pagination)
 *
 * @param filters - Optional filter criteria (date range, title, format, channel)
 * @param page - Page number (1-indexed, default 1)
 * @param pageSize - Items per page (default 20)
 * @returns Paginated sales with related title and user data
 */
export async function getSalesWithFilters(
  filters: SalesFilterInput = {},
  page: number = 1,
  pageSize: number = 20,
): Promise<PaginatedSales> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Build WHERE conditions
  const conditions = [eq(sales.tenant_id, tenantId)];

  if (filters.title_id) {
    conditions.push(eq(sales.title_id, filters.title_id));
  }
  if (filters.format) {
    conditions.push(eq(sales.format, filters.format));
  }
  if (filters.channel) {
    conditions.push(eq(sales.channel, filters.channel));
  }
  if (filters.start_date) {
    conditions.push(gte(sales.sale_date, filters.start_date));
  }
  if (filters.end_date) {
    conditions.push(lte(sales.sale_date, filters.end_date));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(sales)
    .where(whereClause);

  const total = countResult?.count ?? 0;

  // Get paginated results with joins
  // Story 7.3: Use contacts (not authors) for author info
  const offset = (page - 1) * pageSize;
  const results = await db
    .select({
      id: sales.id,
      sale_date: sales.sale_date,
      format: sales.format,
      quantity: sales.quantity,
      unit_price: sales.unit_price,
      total_amount: sales.total_amount,
      channel: sales.channel,
      created_at: sales.created_at,
      title_id: titles.id,
      title_name: titles.title,
      author_first_name: contacts.first_name,
      author_last_name: contacts.last_name,
      created_by_email: users.email,
    })
    .from(sales)
    .innerJoin(titles, eq(sales.title_id, titles.id))
    .leftJoin(contacts, eq(titles.contact_id, contacts.id))
    .innerJoin(users, eq(sales.created_by_user_id, users.id))
    .where(whereClause)
    .orderBy(desc(sales.sale_date), desc(sales.created_at))
    .limit(pageSize)
    .offset(offset);

  // Transform to SaleWithRelations
  const items: SaleWithRelations[] = results.map((row) => ({
    id: row.id,
    sale_date: row.sale_date,
    format: row.format,
    quantity: row.quantity,
    unit_price: row.unit_price,
    total_amount: row.total_amount,
    channel: row.channel,
    created_at: row.created_at,
    title: {
      id: row.title_id,
      title: row.title_name,
      author_name:
        row.author_first_name && row.author_last_name
          ? `${row.author_first_name} ${row.author_last_name}`.trim()
          : row.author_first_name || row.author_last_name || "Unknown Author",
    },
    createdBy: {
      name: row.created_by_email.split("@")[0], // Use email prefix as name
    },
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get sales statistics for dashboard cards
 *
 * Story 3.3: AC 2 (stats cards)
 * Stats are calculated based on current month by default, or filtered date range
 *
 * @param filters - Optional filter criteria (respects same filters as table)
 * @returns Stats: total sales $, transaction count, best selling title
 */
export async function getSalesStats(
  filters: SalesFilterInput = {},
): Promise<SalesStats> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Default to current month if no date range specified
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const effectiveStartDate = filters.start_date || startOfMonth;
  const effectiveEndDate = filters.end_date || endOfMonth;

  // Build WHERE conditions
  const conditions = [
    eq(sales.tenant_id, tenantId),
    gte(sales.sale_date, effectiveStartDate),
    lte(sales.sale_date, effectiveEndDate),
  ];

  if (filters.title_id) {
    conditions.push(eq(sales.title_id, filters.title_id));
  }
  if (filters.format) {
    conditions.push(eq(sales.format, filters.format));
  }
  if (filters.channel) {
    conditions.push(eq(sales.channel, filters.channel));
  }

  const whereClause = and(...conditions);

  // Get total sales and count
  const [totalsResult] = await db
    .select({
      totalAmount: sum(sales.total_amount),
      transactionCount: count(),
    })
    .from(sales)
    .where(whereClause);

  // Get best selling title (by quantity)
  const [bestSellerResult] = await db
    .select({
      title: titles.title,
      units: sum(sales.quantity),
    })
    .from(sales)
    .innerJoin(titles, eq(sales.title_id, titles.id))
    .where(whereClause)
    .groupBy(titles.id, titles.title)
    .orderBy(desc(sum(sales.quantity)))
    .limit(1);

  return {
    totalSalesThisMonth: totalsResult?.totalAmount ?? "0",
    transactionsThisMonth: totalsResult?.transactionCount ?? 0,
    bestSellingTitle: bestSellerResult
      ? {
          title: bestSellerResult.title,
          units: Number(bestSellerResult.units) || 0,
        }
      : null,
  };
}

/**
 * Get a single sale by ID with relations
 *
 * Story 3.3: AC 6 (transaction detail modal)
 *
 * @param saleId - Sale UUID
 * @returns Sale with related data or null if not found
 */
export async function getSaleById(
  saleId: string,
): Promise<SaleWithRelations | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Story 7.3: Use contacts (not authors) for author info
  const results = await db
    .select({
      id: sales.id,
      sale_date: sales.sale_date,
      format: sales.format,
      quantity: sales.quantity,
      unit_price: sales.unit_price,
      total_amount: sales.total_amount,
      channel: sales.channel,
      created_at: sales.created_at,
      title_id: titles.id,
      title_name: titles.title,
      author_first_name: contacts.first_name,
      author_last_name: contacts.last_name,
      created_by_email: users.email,
    })
    .from(sales)
    .innerJoin(titles, eq(sales.title_id, titles.id))
    .leftJoin(contacts, eq(titles.contact_id, contacts.id))
    .innerJoin(users, eq(sales.created_by_user_id, users.id))
    .where(and(eq(sales.tenant_id, tenantId), eq(sales.id, saleId)))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const row = results[0];
  return {
    id: row.id,
    sale_date: row.sale_date,
    format: row.format,
    quantity: row.quantity,
    unit_price: row.unit_price,
    total_amount: row.total_amount,
    channel: row.channel,
    created_at: row.created_at,
    title: {
      id: row.title_id,
      title: row.title_name,
      author_name:
        row.author_first_name && row.author_last_name
          ? `${row.author_first_name} ${row.author_last_name}`.trim()
          : row.author_first_name || row.author_last_name || "Unknown Author",
    },
    createdBy: {
      name: row.created_by_email.split("@")[0], // Use email prefix as name
    },
  };
}
