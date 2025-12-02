"use server";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import { titles } from "@/db/schema/titles";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import type { PublicationStatus, TitleWithAuthor } from "./types";

/**
 * Filters for querying titles
 */
export interface TitleFilters {
  search?: string;
  status?: PublicationStatus;
  authorId?: string;
}

/**
 * Get all titles for the current tenant with author info
 * @param filters - Optional filtering options
 * @returns Array of titles with author info (sorted by updated_at DESC)
 *
 * AC 2: List sorted by most recently updated
 */
export async function getTitles(
  filters?: TitleFilters,
): Promise<TitleWithAuthor[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const conditions = [eq(titles.tenant_id, tenantId)];

  // Publication status filter
  if (filters?.status) {
    conditions.push(eq(titles.publication_status, filters.status));
  }

  // Author filter
  if (filters?.authorId) {
    conditions.push(eq(titles.author_id, filters.authorId));
  }

  // Search filter (title, author name, ISBN, eISBN)
  // Note: Author name search requires a join, handled separately
  // Search filter (title, author name, ISBN, eISBN)
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    const searchCondition = or(
      ilike(titles.title, searchTerm),
      ilike(titles.isbn, searchTerm),
      ilike(titles.eisbn, searchTerm),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const result = await db.query.titles.findMany({
    where: and(...conditions),
    with: {
      author: true,
    },
    orderBy: desc(titles.updated_at),
  });

  // If searching by author name, filter results in memory
  // This is a tradeoff for simpler query structure
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    return result.filter(
      (title) =>
        title.title.toLowerCase().includes(searchLower) ||
        title.author.name.toLowerCase().includes(searchLower) ||
        title.isbn?.toLowerCase().includes(searchLower) ||
        title.eisbn?.toLowerCase().includes(searchLower),
    );
  }

  return result;
}

/**
 * Get a single title by ID with author info
 * @param id - Title UUID
 * @returns Title with author or null if not found
 */
export async function getTitleById(
  id: string,
): Promise<TitleWithAuthor | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const title = await db.query.titles.findFirst({
    where: and(eq(titles.id, id), eq(titles.tenant_id, tenantId)),
    with: {
      author: true,
    },
  });

  return title || null;
}
