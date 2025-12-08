"use server";

/**
 * Royalties Module Queries
 *
 * Query functions for fetching contract data.
 * Used by contract forms, lists, and detail views.
 *
 * Story 4.2: Build Contract Creation Form with Tiered Royalty Configuration
 * Related FRs: FR38-FR40 (Royalty Contract Management)
 */

import { and, asc, desc, eq, gte, ilike, lte, or, sum } from "drizzle-orm";
import { contactRoles, contacts } from "@/db/schema/contacts";
import type { ContractFormat } from "@/db/schema/contracts";
import { contracts, contractTiers } from "@/db/schema/contracts";
import { returns } from "@/db/schema/returns";
import { sales } from "@/db/schema/sales";
import { titles } from "@/db/schema/titles";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import type {
  AuthorOption,
  ContractWithRelations,
  PaginatedContracts,
  TitleOption,
} from "./types";

/**
 * Search authors for contract dropdown
 * Returns active authors (contacts with role='author') matching search term
 *
 * Story 7.3: Uses contacts + contact_roles tables instead of deprecated authors table
 *
 * @param searchTerm - Search query for name or email
 * @param limit - Maximum results to return (default 10)
 * @returns Array of author options for dropdown
 */
export async function searchAuthorsForContract(
  searchTerm: string,
  limit = 10,
): Promise<AuthorOption[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Story 7.3: Query contacts with role='author' via contact_roles table
  const conditions = [
    eq(contacts.tenant_id, tenantId),
    eq(contacts.status, "active"),
    eq(contactRoles.role, "author"),
  ];

  if (searchTerm.trim()) {
    const term = `%${searchTerm.trim()}%`;
    const searchCondition = or(
      ilike(contacts.first_name, term),
      ilike(contacts.last_name, term),
      ilike(contacts.email, term),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const results = await db
    .select({
      id: contacts.id,
      first_name: contacts.first_name,
      last_name: contacts.last_name,
      email: contacts.email,
    })
    .from(contacts)
    .innerJoin(contactRoles, eq(contacts.id, contactRoles.contact_id))
    .where(and(...conditions))
    .orderBy(asc(contacts.last_name), asc(contacts.first_name))
    .limit(limit);

  // Transform to AuthorOption format with combined name
  return results.map((r) => ({
    id: r.id,
    name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || "Unknown",
    email: r.email,
  }));
}

/**
 * Search titles for contract dropdown
 * Returns titles matching search term with author info
 *
 * @param searchTerm - Search query for title name
 * @param limit - Maximum results to return (default 10)
 * @returns Array of title options for dropdown
 */
export async function searchTitlesForContract(
  searchTerm: string,
  limit = 10,
): Promise<TitleOption[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const conditions = [eq(titles.tenant_id, tenantId)];

  if (searchTerm.trim()) {
    const term = `%${searchTerm.trim()}%`;
    const searchCondition = ilike(titles.title, term);
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  // Story 7.3: Use contact relation instead of deprecated author relation
  const results = await db.query.titles.findMany({
    where: and(...conditions),
    with: {
      contact: {
        columns: {
          first_name: true,
          last_name: true,
        },
      },
    },
    orderBy: desc(titles.updated_at),
    limit,
    columns: {
      id: true,
      title: true,
    },
  });

  return results.map((t) => ({
    id: t.id,
    title: t.title,
    author_name: t.contact
      ? `${t.contact.first_name || ""} ${t.contact.last_name || ""}`.trim()
      : "Unknown Author",
  }));
}

/**
 * Get contract by ID with all relations
 *
 * @param contractId - Contract UUID
 * @returns Contract with author, title, and tiers or null
 */
export async function getContractById(
  contractId: string,
): Promise<ContractWithRelations | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const contract = await db.query.contracts.findFirst({
    where: and(eq(contracts.id, contractId), eq(contracts.tenant_id, tenantId)),
    with: {
      author: true,
      title: true,
      tiers: {
        orderBy: [asc(contractTiers.format), asc(contractTiers.min_quantity)],
      },
    },
  });

  return contract || null;
}

/**
 * Get all contracts for current tenant with pagination
 *
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns Paginated contracts with relations
 */
export async function getContracts(
  page = 1,
  pageSize = 20,
): Promise<PaginatedContracts> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const offset = (page - 1) * pageSize;

  const [items, countResult] = await Promise.all([
    db.query.contracts.findMany({
      where: eq(contracts.tenant_id, tenantId),
      with: {
        author: true,
        title: true,
        tiers: {
          orderBy: [asc(contractTiers.format), asc(contractTiers.min_quantity)],
        },
      },
      orderBy: desc(contracts.updated_at),
      limit: pageSize,
      offset,
    }),
    db
      .select({ count: contracts.id })
      .from(contracts)
      .where(eq(contracts.tenant_id, tenantId)),
  ]);

  const total = countResult.length;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Check if a contract already exists for author + title
 *
 * @param authorId - Author UUID
 * @param titleId - Title UUID
 * @returns true if duplicate exists
 */
export async function checkDuplicateContract(
  authorId: string,
  titleId: string,
): Promise<boolean> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const existing = await db.query.contracts.findFirst({
    where: and(
      eq(contracts.tenant_id, tenantId),
      eq(contracts.author_id, authorId),
      eq(contracts.title_id, titleId),
    ),
    columns: {
      id: true,
    },
  });

  return existing !== undefined;
}

/**
 * Get author by ID for validation
 * Story 7.3: Uses contacts + contact_roles tables instead of deprecated authors table
 *
 * @param authorId - Contact UUID (author)
 * @returns Author or null
 */
export async function getAuthorForContract(authorId: string) {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const result = await db
    .select({
      id: contacts.id,
      first_name: contacts.first_name,
      last_name: contacts.last_name,
    })
    .from(contacts)
    .innerJoin(contactRoles, eq(contacts.id, contactRoles.contact_id))
    .where(
      and(
        eq(contacts.id, authorId),
        eq(contacts.tenant_id, tenantId),
        eq(contactRoles.role, "author"),
      ),
    )
    .limit(1);

  if (result.length === 0) {
    return undefined;
  }

  const r = result[0];
  return {
    id: r.id,
    name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || "Unknown",
  };
}

/**
 * Get title by ID for validation
 * Story 7.3: Uses contact relation instead of deprecated author relation
 *
 * @param titleId - Title UUID
 * @returns Title with author or null
 */
export async function getTitleForContract(titleId: string) {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const result = await db.query.titles.findFirst({
    where: and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)),
    with: {
      contact: {
        columns: {
          first_name: true,
          last_name: true,
        },
      },
    },
    columns: {
      id: true,
      title: true,
    },
  });

  if (!result) {
    return undefined;
  }

  // Transform to expected shape with author name
  return {
    id: result.id,
    title: result.title,
    author: result.contact
      ? {
          name:
            `${result.contact.first_name || ""} ${result.contact.last_name || ""}`.trim() ||
            "Unknown",
        }
      : { name: "Unknown Author" },
  };
}

// ============================================================================
// Royalty Calculation Queries (Story 4.4)
// ============================================================================

/**
 * Sales aggregation result by format
 * Used for royalty calculation
 */
export interface FormatSalesData {
  format: ContractFormat;
  totalQuantity: number;
  totalAmount: number;
}

// ============================================================================
// Admin Versions for Background Jobs (Inngest)
// These functions use adminDb and don't require auth context
// ============================================================================

import { adminDb } from "@/db";

/**
 * Get sales aggregated by format for background jobs (admin mode)
 * Uses adminDb - no auth required
 */
export async function getSalesByFormatForPeriodAdmin(
  tenantId: string,
  titleId: string,
  startDate: Date,
  endDate: Date,
): Promise<FormatSalesData[]> {
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  const results = await adminDb
    .select({
      format: sales.format,
      totalQuantity: sum(sales.quantity),
      totalAmount: sum(sales.total_amount),
    })
    .from(sales)
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        eq(sales.title_id, titleId),
        gte(sales.sale_date, startDateStr),
        lte(sales.sale_date, endDateStr),
      ),
    )
    .groupBy(sales.format);

  return results.map((r) => ({
    format: r.format as ContractFormat,
    totalQuantity: Number(r.totalQuantity) || 0,
    totalAmount: Number(r.totalAmount) || 0,
  }));
}

/**
 * Get approved returns aggregated by format for background jobs (admin mode)
 * Uses adminDb - no auth required
 */
export async function getApprovedReturnsByFormatForPeriodAdmin(
  tenantId: string,
  titleId: string,
  startDate: Date,
  endDate: Date,
): Promise<FormatSalesData[]> {
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  const results = await adminDb
    .select({
      format: returns.format,
      totalQuantity: sum(returns.quantity),
      totalAmount: sum(returns.total_amount),
    })
    .from(returns)
    .where(
      and(
        eq(returns.tenant_id, tenantId),
        eq(returns.title_id, titleId),
        eq(returns.status, "approved"),
        gte(returns.return_date, startDateStr),
        lte(returns.return_date, endDateStr),
      ),
    )
    .groupBy(returns.format);

  return results.map((r) => ({
    format: r.format as ContractFormat,
    totalQuantity: Number(r.totalQuantity) || 0,
    totalAmount: Number(r.totalAmount) || 0,
  }));
}

/**
 * Get contract by author and tenant for background jobs (admin mode)
 * Uses adminDb - no auth required
 * Story 7.3: Checks both contact_id and author_id
 */
export async function getContractByAuthorAndTenantAdmin(
  authorId: string,
  tenantId: string,
): Promise<ContractWithRelations | null> {
  const contract = await adminDb.query.contracts.findFirst({
    where: and(
      or(eq(contracts.contact_id, authorId), eq(contracts.author_id, authorId)),
      eq(contracts.tenant_id, tenantId),
      eq(contracts.status, "active"),
    ),
    with: {
      author: true,
      title: true,
      tiers: {
        orderBy: [asc(contractTiers.format), asc(contractTiers.min_quantity)],
      },
    },
  });

  return contract || null;
}

/**
 * Get sales aggregated by format for a specific title and period
 *
 * Story 4.4 AC 3: Query sales table filtered by tenant_id, title_id, sale_date within period
 * Related FRs: FR46 (Net sales calculation)
 *
 * @param tenantId - Tenant UUID
 * @param titleId - Title UUID from contract
 * @param startDate - Period start date (inclusive)
 * @param endDate - Period end date (inclusive)
 * @returns Array of format sales data
 */
export async function getSalesByFormatForPeriod(
  tenantId: string,
  titleId: string,
  startDate: Date,
  endDate: Date,
): Promise<FormatSalesData[]> {
  const db = await getDb();

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  const results = await db
    .select({
      format: sales.format,
      totalQuantity: sum(sales.quantity),
      totalAmount: sum(sales.total_amount),
    })
    .from(sales)
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        eq(sales.title_id, titleId),
        gte(sales.sale_date, startDateStr),
        lte(sales.sale_date, endDateStr),
      ),
    )
    .groupBy(sales.format);

  return results.map((r) => ({
    format: r.format as ContractFormat,
    totalQuantity: Number(r.totalQuantity) || 0,
    totalAmount: Number(r.totalAmount) || 0,
  }));
}

/**
 * Get approved returns aggregated by format for a specific title and period
 *
 * Story 4.4 AC 3: Query approved returns ONLY (status = 'approved') for same criteria
 * Related FRs: FR36 (Only approved returns affect royalty calculations)
 *
 * @param tenantId - Tenant UUID
 * @param titleId - Title UUID from contract
 * @param startDate - Period start date (inclusive)
 * @param endDate - Period end date (inclusive)
 * @returns Array of format returns data
 */
export async function getApprovedReturnsByFormatForPeriod(
  tenantId: string,
  titleId: string,
  startDate: Date,
  endDate: Date,
): Promise<FormatSalesData[]> {
  const db = await getDb();

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  const results = await db
    .select({
      format: returns.format,
      totalQuantity: sum(returns.quantity),
      totalAmount: sum(returns.total_amount),
    })
    .from(returns)
    .where(
      and(
        eq(returns.tenant_id, tenantId),
        eq(returns.title_id, titleId),
        eq(returns.status, "approved"),
        gte(returns.return_date, startDateStr),
        lte(returns.return_date, endDateStr),
      ),
    )
    .groupBy(returns.format);

  return results.map((r) => ({
    format: r.format as ContractFormat,
    totalQuantity: Number(r.totalQuantity) || 0,
    totalAmount: Number(r.totalAmount) || 0,
  }));
}

/**
 * Get contract by author and tenant with all tiers
 *
 * Story 4.4 AC 2: Query contract by author_id and tenant_id
 * Story 7.3: Also checks contact_id for new contracts
 * Used by calculation engine to load contract for royalty calculation
 *
 * @param authorId - Author UUID (now actually contact ID for new contracts)
 * @param tenantId - Tenant UUID
 * @returns Contract with relations or null if no contract exists
 */
export async function getContractByAuthorAndTenant(
  authorId: string,
  tenantId: string,
): Promise<ContractWithRelations | null> {
  const db = await getDb();

  // Story 7.3: Check both contact_id (new) and author_id (legacy) for contracts
  const contract = await db.query.contracts.findFirst({
    where: and(
      or(eq(contracts.contact_id, authorId), eq(contracts.author_id, authorId)),
      eq(contracts.tenant_id, tenantId),
      eq(contracts.status, "active"),
    ),
    with: {
      author: true,
      title: true,
      tiers: {
        orderBy: [asc(contractTiers.format), asc(contractTiers.min_quantity)],
      },
    },
  });

  return contract || null;
}
