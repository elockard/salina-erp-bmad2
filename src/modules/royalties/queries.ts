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

import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  sum,
} from "drizzle-orm";
import { contactRoles, contacts } from "@/db/schema/contacts";
import type { ContractFormat } from "@/db/schema/contracts";
import { contracts, contractTiers } from "@/db/schema/contracts";
import { returns } from "@/db/schema/returns";
import { sales } from "@/db/schema/sales";
import { titleAuthors } from "@/db/schema/title-authors";
import { titles } from "@/db/schema/titles";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import type {
  AnnualRoyaltyProjection,
  AuthorOption,
  ContractWithRelations,
  PaginatedContracts,
  RoyaltyProjection,
  SalesVelocity,
  TierCrossoverProjection,
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

// ============================================================================
// Story 10.2: Split Royalty Calculation Queries
// ============================================================================

/**
 * Get contract for a specific contact and title combination
 *
 * Story 10.2 AC-10.2.3: Per-Author Advance Recoupment
 * Story 10.2 AC-10.2.9: Author Without Contract Handling
 *
 * CRITICAL: An author (contact) may have contracts for MULTIPLE titles.
 * This function gets the contract for ONE specific title.
 *
 * @param contactId - Contact UUID (author)
 * @param titleId - Title UUID
 * @param tenantId - Tenant UUID
 * @returns Contract with tiers or null if no contract exists
 */
export async function getContractByContactAndTitle(
  contactId: string,
  titleId: string,
  tenantId: string,
): Promise<ContractWithRelations | null> {
  const db = await getDb();

  const contract = await db.query.contracts.findFirst({
    where: and(
      or(
        eq(contracts.contact_id, contactId),
        eq(contracts.author_id, contactId),
      ),
      eq(contracts.title_id, titleId),
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
 * Get contract for a specific contact and title (admin mode)
 * Uses adminDb - no auth required
 *
 * Story 10.2: For Inngest background jobs
 */
export async function getContractByContactAndTitleAdmin(
  contactId: string,
  titleId: string,
  tenantId: string,
): Promise<ContractWithRelations | null> {
  const contract = await adminDb.query.contracts.findFirst({
    where: and(
      or(
        eq(contracts.contact_id, contactId),
        eq(contracts.author_id, contactId),
      ),
      eq(contracts.title_id, titleId),
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
 * Title author with contract information for split calculation
 * Story 10.2: AC-10.2.3
 */
export interface TitleAuthorWithContract {
  contactId: string;
  ownershipPercentage: number;
  isPrimary: boolean;
  contract: ContractWithRelations | null;
  contactName: string;
}

/**
 * Get title authors with their contracts for split royalty calculation
 *
 * Story 10.2 AC-10.2.3: Per-Author Advance Recoupment
 * Story 10.2 AC-10.2.9: Author Without Contract Handling
 *
 * Returns all authors for a title with their ownership percentages
 * AND their contract info for recoupment calculation.
 *
 * OPTIMIZED: Uses batch query to avoid N+1 problem (Code Review fix)
 *
 * @param titleId - Title UUID
 * @param tenantId - Tenant UUID
 * @returns Array of authors with contracts (contract may be null if missing)
 */
export async function getTitleAuthorsWithContracts(
  titleId: string,
  tenantId: string,
): Promise<TitleAuthorWithContract[]> {
  const db = await getDb();

  // Get all title_authors for this title
  const authors = await db.query.titleAuthors.findMany({
    where: eq(titleAuthors.title_id, titleId),
    with: {
      contact: true,
    },
    orderBy: [
      desc(titleAuthors.is_primary),
      desc(titleAuthors.ownership_percentage),
    ],
  });

  if (authors.length === 0) {
    return [];
  }

  // OPTIMIZED: Batch fetch all contracts for these authors in ONE query
  const contactIds = authors.map((a) => a.contact_id);
  const authorContracts = await db.query.contracts.findMany({
    where: and(
      or(
        inArray(contracts.contact_id, contactIds),
        inArray(contracts.author_id, contactIds),
      ),
      eq(contracts.title_id, titleId),
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

  // Create a map for O(1) contract lookup by contact_id
  const contractMap = new Map<string, ContractWithRelations>();
  for (const contract of authorContracts) {
    // Map by contact_id (preferred) or author_id (legacy)
    if (contract.contact_id) {
      contractMap.set(contract.contact_id, contract);
    }
    if (contract.author_id) {
      contractMap.set(contract.author_id, contract);
    }
  }

  // Build result with O(1) contract lookups
  const result: TitleAuthorWithContract[] = authors.map((author) => ({
    contactId: author.contact_id,
    ownershipPercentage: parseFloat(author.ownership_percentage),
    isPrimary: author.is_primary,
    contract: contractMap.get(author.contact_id) || null,
    contactName: author.contact
      ? `${author.contact.first_name || ""} ${author.contact.last_name || ""}`.trim() ||
        "Unknown"
      : "Unknown",
  }));

  return result;
}

/**
 * Get title authors with contracts (admin mode)
 * Uses adminDb - no auth required
 *
 * Story 10.2: For Inngest background jobs
 * OPTIMIZED: Uses batch query to avoid N+1 problem (Code Review fix)
 */
export async function getTitleAuthorsWithContractsAdmin(
  titleId: string,
  tenantId: string,
): Promise<TitleAuthorWithContract[]> {
  // Get all title_authors for this title
  const authors = await adminDb.query.titleAuthors.findMany({
    where: eq(titleAuthors.title_id, titleId),
    with: {
      contact: true,
    },
    orderBy: [
      desc(titleAuthors.is_primary),
      desc(titleAuthors.ownership_percentage),
    ],
  });

  if (authors.length === 0) {
    return [];
  }

  // OPTIMIZED: Batch fetch all contracts for these authors in ONE query
  const contactIds = authors.map((a) => a.contact_id);
  const authorContracts = await adminDb.query.contracts.findMany({
    where: and(
      or(
        inArray(contracts.contact_id, contactIds),
        inArray(contracts.author_id, contactIds),
      ),
      eq(contracts.title_id, titleId),
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

  // Create a map for O(1) contract lookup by contact_id
  const contractMap = new Map<string, ContractWithRelations>();
  for (const contract of authorContracts) {
    // Map by contact_id (preferred) or author_id (legacy)
    if (contract.contact_id) {
      contractMap.set(contract.contact_id, contract);
    }
    if (contract.author_id) {
      contractMap.set(contract.author_id, contract);
    }
  }

  // Build result with O(1) contract lookups
  const result: TitleAuthorWithContract[] = authors.map((author) => ({
    contactId: author.contact_id,
    ownershipPercentage: parseFloat(author.ownership_percentage),
    isPrimary: author.is_primary,
    contract: contractMap.get(author.contact_id) || null,
    contactName: author.contact
      ? `${author.contact.first_name || ""} ${author.contact.last_name || ""}`.trim() ||
        "Unknown"
      : "Unknown",
  }));

  return result;
}

// ============================================================================
// Story 10.4: Lifetime Sales Tracking Queries
// ============================================================================

/**
 * Lifetime sales data for a title/format combination
 * Story 10.4: AC-10.4.2
 */
export interface LifetimeSalesData {
  /** Total lifetime quantity sold before the specified date */
  lifetimeQuantity: number;
  /** Total lifetime revenue before the specified date */
  lifetimeRevenue: number;
}

/**
 * Get lifetime sales for a title/format before a specific date
 *
 * Story 10.4 AC-10.4.2: Lifetime Sales Tracking
 * Story 10.4 AC-10.4.3: Lifetime Tier Calculation Engine
 *
 * Computes cumulative sales from historical data on-demand.
 * Uses tenant-scoped query for API/Server Actions.
 *
 * IMPORTANT: This returns sales BEFORE the specified date (exclusive),
 * so the current period's sales are NOT included. This allows proper
 * tier calculation where current period sales are added to lifetime.
 *
 * @param tenantId - Tenant UUID
 * @param titleId - Title UUID
 * @param format - Format type (physical, ebook, audiobook)
 * @param beforeDate - Calculate lifetime sales before this date (exclusive)
 * @returns Lifetime sales data (quantity and revenue)
 */
export async function getLifetimeSalesBeforeDate(
  tenantId: string,
  titleId: string,
  format: ContractFormat,
  beforeDate: Date,
): Promise<LifetimeSalesData> {
  const db = await getDb();
  const beforeDateStr = beforeDate.toISOString().split("T")[0];

  const result = await db
    .select({
      totalQuantity: sum(sales.quantity),
      totalRevenue: sum(sales.total_amount),
    })
    .from(sales)
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        eq(sales.title_id, titleId),
        eq(sales.format, format),
        lt(sales.sale_date, beforeDateStr),
      ),
    );

  return {
    lifetimeQuantity: Number(result[0]?.totalQuantity) || 0,
    lifetimeRevenue: Number(result[0]?.totalRevenue) || 0,
  };
}

/**
 * Get lifetime sales for a title/format before a specific date (admin mode)
 *
 * Story 10.4 AC-10.4.2: Lifetime Sales Tracking
 * Uses adminDb for Inngest background jobs (no auth context).
 *
 * @param tenantId - Tenant UUID
 * @param titleId - Title UUID
 * @param format - Format type (physical, ebook, audiobook)
 * @param beforeDate - Calculate lifetime sales before this date (exclusive)
 * @returns Lifetime sales data (quantity and revenue)
 */
export async function getLifetimeSalesBeforeDateAdmin(
  tenantId: string,
  titleId: string,
  format: ContractFormat,
  beforeDate: Date,
): Promise<LifetimeSalesData> {
  const beforeDateStr = beforeDate.toISOString().split("T")[0];

  const result = await adminDb
    .select({
      totalQuantity: sum(sales.quantity),
      totalRevenue: sum(sales.total_amount),
    })
    .from(sales)
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        eq(sales.title_id, titleId),
        eq(sales.format, format),
        lt(sales.sale_date, beforeDateStr),
      ),
    );

  return {
    lifetimeQuantity: Number(result[0]?.totalQuantity) || 0,
    lifetimeRevenue: Number(result[0]?.totalRevenue) || 0,
  };
}

/**
 * Get lifetime sales for ALL formats of a title before a specific date
 *
 * Story 10.4 AC-10.4.3: Lifetime Tier Calculation Engine
 *
 * Returns a map of format -> lifetime sales for efficient lookup.
 * Uses tenant-scoped query for API/Server Actions.
 *
 * @param tenantId - Tenant UUID
 * @param titleId - Title UUID
 * @param beforeDate - Calculate lifetime sales before this date (exclusive)
 * @returns Map of format to lifetime sales data
 */
export async function getLifetimeSalesByFormatBeforeDate(
  tenantId: string,
  titleId: string,
  beforeDate: Date,
): Promise<Map<ContractFormat, LifetimeSalesData>> {
  const db = await getDb();
  const beforeDateStr = beforeDate.toISOString().split("T")[0];

  const results = await db
    .select({
      format: sales.format,
      totalQuantity: sum(sales.quantity),
      totalRevenue: sum(sales.total_amount),
    })
    .from(sales)
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        eq(sales.title_id, titleId),
        lt(sales.sale_date, beforeDateStr),
      ),
    )
    .groupBy(sales.format);

  const lifetimeMap = new Map<ContractFormat, LifetimeSalesData>();
  for (const r of results) {
    lifetimeMap.set(r.format as ContractFormat, {
      lifetimeQuantity: Number(r.totalQuantity) || 0,
      lifetimeRevenue: Number(r.totalRevenue) || 0,
    });
  }

  return lifetimeMap;
}

/**
 * Get lifetime sales for ALL formats of a title before a specific date (admin mode)
 *
 * Story 10.4 AC-10.4.3: Lifetime Tier Calculation Engine
 * Uses adminDb for Inngest background jobs (no auth context).
 *
 * @param tenantId - Tenant UUID
 * @param titleId - Title UUID
 * @param beforeDate - Calculate lifetime sales before this date (exclusive)
 * @returns Map of format to lifetime sales data
 */
export async function getLifetimeSalesByFormatBeforeDateAdmin(
  tenantId: string,
  titleId: string,
  beforeDate: Date,
): Promise<Map<ContractFormat, LifetimeSalesData>> {
  const beforeDateStr = beforeDate.toISOString().split("T")[0];

  const results = await adminDb
    .select({
      format: sales.format,
      totalQuantity: sum(sales.quantity),
      totalRevenue: sum(sales.total_amount),
    })
    .from(sales)
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        eq(sales.title_id, titleId),
        lt(sales.sale_date, beforeDateStr),
      ),
    )
    .groupBy(sales.format);

  const lifetimeMap = new Map<ContractFormat, LifetimeSalesData>();
  for (const r of results) {
    lifetimeMap.set(r.format as ContractFormat, {
      lifetimeQuantity: Number(r.totalQuantity) || 0,
      lifetimeRevenue: Number(r.totalRevenue) || 0,
    });
  }

  return lifetimeMap;
}

// ============================================================================
// Royalty Projection Functions (Story 10.4 AC-10.4.7)
// ============================================================================

/**
 * Calculate sales velocity for a title
 *
 * Story 10.4 AC-10.4.7: Compute sales velocity from recent periods
 *
 * Analyzes sales over the specified number of months to determine
 * average monthly sales rate for projection calculations.
 *
 * @param tenantId - Tenant UUID
 * @param titleId - Title UUID
 * @param monthsToAnalyze - Number of months to look back (default: 6)
 * @returns Sales velocity data
 */
export async function getSalesVelocity(
  tenantId: string,
  titleId: string,
  monthsToAnalyze: number = 6,
): Promise<SalesVelocity> {
  const db = await getDb();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsToAnalyze);

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  const result = await db
    .select({
      totalQuantity: sum(sales.quantity),
      totalRevenue: sum(sales.total_amount),
    })
    .from(sales)
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        eq(sales.title_id, titleId),
        gte(sales.sale_date, startDateStr),
        lte(sales.sale_date, endDateStr),
      ),
    );

  const totalQuantity = Number(result[0]?.totalQuantity) || 0;
  const totalRevenue = Number(result[0]?.totalRevenue) || 0;

  return {
    unitsPerMonth: monthsToAnalyze > 0 ? totalQuantity / monthsToAnalyze : 0,
    revenuePerMonth: monthsToAnalyze > 0 ? totalRevenue / monthsToAnalyze : 0,
    monthsAnalyzed: monthsToAnalyze,
    analysisStartDate: startDate,
    analysisEndDate: endDate,
  };
}

/**
 * Get current lifetime sales for a title (all formats combined)
 *
 * Story 10.4 AC-10.4.7: Get current position for projection
 *
 * @param tenantId - Tenant UUID
 * @param titleId - Title UUID
 * @returns Total lifetime sales across all formats
 */
export async function getTotalLifetimeSales(
  tenantId: string,
  titleId: string,
): Promise<{ quantity: number; revenue: number }> {
  const db = await getDb();

  const result = await db
    .select({
      totalQuantity: sum(sales.quantity),
      totalRevenue: sum(sales.total_amount),
    })
    .from(sales)
    .where(and(eq(sales.tenant_id, tenantId), eq(sales.title_id, titleId)));

  return {
    quantity: Number(result[0]?.totalQuantity) || 0,
    revenue: Number(result[0]?.totalRevenue) || 0,
  };
}

/**
 * Calculate royalty projection for a lifetime-mode contract
 *
 * Story 10.4 AC-10.4.7: Finance users can view royalty projection
 * - Show estimated tier crossover date based on recent sales velocity
 * - Display projected annual royalty at current rate vs escalated rate
 *
 * @param tenantId - Tenant UUID
 * @param contract - Contract with tiers
 * @param monthsToAnalyze - Number of months to use for velocity calculation
 * @returns Royalty projection data
 */
export async function calculateRoyaltyProjection(
  tenantId: string,
  contract: {
    id: string;
    title_id: string;
    tier_calculation_mode: string;
    tiers: {
      format: string;
      min_quantity: number;
      max_quantity: number | null;
      rate: string;
    }[];
  },
  monthsToAnalyze: number = 6,
): Promise<RoyaltyProjection> {
  const warnings: string[] = [];

  // Get sales velocity
  const velocity = await getSalesVelocity(
    tenantId,
    contract.title_id,
    monthsToAnalyze,
  );

  if (velocity.unitsPerMonth === 0) {
    warnings.push(
      "No sales in the analysis period. Projections may be inaccurate.",
    );
  }

  // Get current lifetime sales
  const lifetimeSales = await getTotalLifetimeSales(
    tenantId,
    contract.title_id,
  );

  // Sort tiers by min_quantity for each format
  const tiersByFormat = new Map<ContractFormat, typeof contract.tiers>();
  for (const tier of contract.tiers) {
    const format = tier.format as ContractFormat;
    if (!tiersByFormat.has(format)) {
      tiersByFormat.set(format, []);
    }
    tiersByFormat.get(format)?.push(tier);
  }

  // Sort each format's tiers
  for (const [, tiers] of tiersByFormat) {
    tiers.sort((a, b) => a.min_quantity - b.min_quantity);
  }

  // Calculate tier crossovers for each format
  const tierCrossovers = new Map<ContractFormat, TierCrossoverProjection>();

  for (const [format, tiers] of tiersByFormat) {
    const crossover = calculateTierCrossover(
      lifetimeSales.quantity,
      tiers,
      velocity.unitsPerMonth,
    );
    tierCrossovers.set(format, crossover);
  }

  // Calculate annual projection
  const annualProjection = calculateAnnualProjection(
    lifetimeSales.quantity,
    lifetimeSales.revenue / lifetimeSales.quantity || 0, // Average price per unit
    velocity.unitsPerMonth,
    contract.tiers,
  );

  return {
    contractId: contract.id,
    titleId: contract.title_id,
    velocity,
    tierCrossovers,
    annualProjection,
    generatedAt: new Date(),
    warnings,
  };
}

/**
 * Calculate tier crossover projection for a single format
 *
 * @param currentLifetimeSales - Current total lifetime sales
 * @param tiers - Tiers for this format, sorted by min_quantity
 * @param unitsPerMonth - Monthly sales velocity
 * @returns Tier crossover projection
 */
function calculateTierCrossover(
  currentLifetimeSales: number,
  tiers: { min_quantity: number; max_quantity: number | null; rate: string }[],
  unitsPerMonth: number,
): TierCrossoverProjection {
  // Find current tier
  let currentTierIndex = 0;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (
      currentLifetimeSales >= tier.min_quantity &&
      (tier.max_quantity === null || currentLifetimeSales < tier.max_quantity)
    ) {
      currentTierIndex = i;
      break;
    }
    // If we're past this tier's max, continue to next
    if (
      tier.max_quantity !== null &&
      currentLifetimeSales >= tier.max_quantity
    ) {
      currentTierIndex = i + 1;
    }
  }

  // Ensure we don't go past the last tier
  if (currentTierIndex >= tiers.length) {
    currentTierIndex = tiers.length - 1;
  }

  const currentTier = tiers[currentTierIndex];
  const nextTier =
    currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;

  // Calculate units to next tier
  const nextTierThreshold = nextTier?.min_quantity ?? null;
  const unitsToNextTier =
    nextTierThreshold !== null
      ? Math.max(0, nextTierThreshold - currentLifetimeSales)
      : null;

  // Calculate estimated crossover date
  let estimatedCrossoverDate: Date | null = null;
  let monthsToNextTier: number | null = null;

  if (unitsToNextTier !== null && unitsPerMonth > 0) {
    monthsToNextTier = Math.ceil(unitsToNextTier / unitsPerMonth);
    estimatedCrossoverDate = new Date();
    estimatedCrossoverDate.setMonth(
      estimatedCrossoverDate.getMonth() + monthsToNextTier,
    );
  }

  return {
    currentTier: {
      minQuantity: currentTier.min_quantity,
      maxQuantity: currentTier.max_quantity,
      rate: parseFloat(currentTier.rate),
    },
    nextTierThreshold,
    currentLifetimeSales,
    unitsToNextTier,
    estimatedCrossoverDate,
    monthsToNextTier,
  };
}

/**
 * Calculate annual royalty projection comparison
 *
 * @param currentLifetimeSales - Current lifetime sales
 * @param avgPricePerUnit - Average revenue per unit
 * @param unitsPerMonth - Monthly sales velocity
 * @param tiers - All contract tiers
 * @returns Annual royalty projection comparison
 */
function calculateAnnualProjection(
  currentLifetimeSales: number,
  avgPricePerUnit: number,
  unitsPerMonth: number,
  tiers: {
    format: string;
    min_quantity: number;
    max_quantity: number | null;
    rate: string;
  }[],
): AnnualRoyaltyProjection {
  const projectedAnnualUnits = unitsPerMonth * 12;
  const projectedAnnualRevenue = projectedAnnualUnits * avgPricePerUnit;

  // Find current tier rate (use first format's tiers for simplicity)
  // In practice, each format might have different rates
  const sortedTiers = [...tiers].sort(
    (a, b) => a.min_quantity - b.min_quantity,
  );

  let currentRate =
    sortedTiers.length > 0 ? parseFloat(sortedTiers[0].rate) : 0;
  for (const tier of sortedTiers) {
    if (
      currentLifetimeSales >= tier.min_quantity &&
      (tier.max_quantity === null || currentLifetimeSales < tier.max_quantity)
    ) {
      currentRate = parseFloat(tier.rate);
    }
  }

  // Calculate royalty at current fixed rate (no escalation)
  const royaltyAtCurrentRate = projectedAnnualRevenue * currentRate;

  // Calculate royalty with escalation (considering tier transitions)
  let royaltyWithEscalation = 0;
  let wouldCrossoverInYear = false;
  let position = currentLifetimeSales;
  let remainingUnits = projectedAnnualUnits;

  for (const tier of sortedTiers) {
    if (remainingUnits <= 0) break;

    const tierMin = tier.min_quantity;
    const tierMax = tier.max_quantity ?? Number.MAX_SAFE_INTEGER;
    const rate = parseFloat(tier.rate);

    // Skip tiers we've passed
    if (position >= tierMax) continue;

    // Find overlap
    const rangeStart = Math.max(position, tierMin);
    const rangeEnd = Math.min(position + remainingUnits, tierMax);

    if (rangeStart < rangeEnd) {
      const unitsInTier = rangeEnd - rangeStart;
      const tierRevenue = unitsInTier * avgPricePerUnit;
      royaltyWithEscalation += tierRevenue * rate;

      // Check if we crossed into this tier during projection
      if (rangeStart < tierMin && rangeEnd >= tierMin) {
        wouldCrossoverInYear = true;
      }

      position = rangeEnd;
      remainingUnits -= unitsInTier;
    }
  }

  return {
    projectedAnnualUnits,
    projectedAnnualRevenue,
    royaltyAtCurrentRate,
    royaltyWithEscalation,
    escalationBenefit: royaltyWithEscalation - royaltyAtCurrentRate,
    currentRate,
    wouldCrossoverInYear,
  };
}
