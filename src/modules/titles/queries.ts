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

  // Author/Contact filter (Story 7.3: use contact_id)
  if (filters?.authorId) {
    conditions.push(eq(titles.contact_id, filters.authorId));
  }

  // Search filter (title, author name, ISBN)
  // Note: Author name search requires a join, handled separately
  // Story 7.6: Removed eisbn - ISBNs are unified without type distinction
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    const searchCondition = or(
      ilike(titles.title, searchTerm),
      ilike(titles.isbn, searchTerm),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  // Story 7.3: Use contact relation instead of deprecated author relation
  const result = await db.query.titles.findMany({
    where: and(...conditions),
    with: {
      contact: true,
    },
    orderBy: desc(titles.updated_at),
  });

  // Transform contact to author shape for backward compatibility
  const transformed: TitleWithAuthor[] = result.map((title) => ({
    ...title,
    author: title.contact
      ? {
          id: title.contact.id,
          name: `${title.contact.first_name || ""} ${title.contact.last_name || ""}`.trim(),
          email: title.contact.email,
        }
      : { id: "", name: "Unknown Author", email: null },
  }));

  // If searching by author name, filter results in memory
  // This is a tradeoff for simpler query structure
  // Story 7.6: Removed eisbn - ISBNs are unified without type distinction
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    return transformed.filter(
      (title) =>
        title.title.toLowerCase().includes(searchLower) ||
        title.author.name.toLowerCase().includes(searchLower) ||
        title.isbn?.toLowerCase().includes(searchLower),
    );
  }

  return transformed;
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

  // Story 7.3: Use contact relation instead of deprecated author relation
  const title = await db.query.titles.findFirst({
    where: and(eq(titles.id, id), eq(titles.tenant_id, tenantId)),
    with: {
      contact: true,
    },
  });

  if (!title) {
    return null;
  }

  // Transform contact to author shape for backward compatibility
  return {
    ...title,
    author: title.contact
      ? {
          id: title.contact.id,
          name: `${title.contact.first_name || ""} ${title.contact.last_name || ""}`.trim(),
          email: title.contact.email,
        }
      : { id: "", name: "Unknown Author", email: null },
  };
}
