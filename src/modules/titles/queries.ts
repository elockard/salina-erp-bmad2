"use server";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import { titleAuthors } from "@/db/schema/title-authors";
import { titles } from "@/db/schema/titles";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import type {
  PublicationStatus,
  TitleAuthorInfo,
  TitleWithAuthor,
} from "./types";

/**
 * Filters for querying titles
 */
export interface TitleFilters {
  search?: string;
  status?: PublicationStatus;
  authorId?: string;
  /** Include authors array in response (Story 10.1) */
  includeAuthors?: boolean;
}

/**
 * Get all titles for the current tenant with author info
 * @param filters - Optional filtering options
 * @returns Array of titles with author info (sorted by updated_at DESC)
 *
 * AC 2: List sorted by most recently updated
 * Story 10.1: Now uses title_authors for multi-author support
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

  // Search filter (title, ISBN - author name searched separately)
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

  // Story 10.1: Use titleAuthors relation for multi-author support
  const result = await db.query.titles.findMany({
    where: and(...conditions),
    with: {
      contact: true, // Backward compat (deprecated)
      titleAuthors: {
        with: {
          contact: true,
        },
        orderBy: [
          desc(titleAuthors.is_primary),
          desc(titleAuthors.ownership_percentage),
        ],
      },
    },
    orderBy: desc(titles.updated_at),
  });

  // Transform to TitleWithAuthor with both legacy author and new authors array
  let transformed: TitleWithAuthor[] = result.map((title) => {
    // Get primary author from title_authors if available, fallback to legacy contact
    const primaryAuthor =
      title.titleAuthors?.find((ta) => ta.is_primary) ||
      title.titleAuthors?.[0];

    // Build backward-compatible author object
    const author = primaryAuthor?.contact
      ? {
          id: primaryAuthor.contact.id,
          name: `${primaryAuthor.contact.first_name || ""} ${primaryAuthor.contact.last_name || ""}`.trim(),
          email: primaryAuthor.contact.email,
        }
      : title.contact
        ? {
            id: title.contact.id,
            name: `${title.contact.first_name || ""} ${title.contact.last_name || ""}`.trim(),
            email: title.contact.email,
          }
        : { id: "", name: "Unknown Author", email: null };

    // Build authors array (Story 10.1)
    const authors: TitleAuthorInfo[] | undefined = filters?.includeAuthors
      ? title.titleAuthors?.map((ta) => ({
          contactId: ta.contact_id,
          name: ta.contact
            ? `${ta.contact.first_name || ""} ${ta.contact.last_name || ""}`.trim()
            : "Unknown",
          email: ta.contact?.email || null,
          ownershipPercentage: ta.ownership_percentage,
          isPrimary: ta.is_primary,
        }))
      : undefined;

    return {
      ...title,
      author,
      authors,
      isCoAuthored: (title.titleAuthors?.length || 0) > 1,
    };
  });

  // Author filter: filter by contact_id in title_authors
  // Story 10.1: Check title_authors instead of just titles.contact_id
  if (filters?.authorId) {
    // Type for raw query results that may include titleAuthors relation
    type TitleWithRawAuthors = TitleWithAuthor & {
      titleAuthors?: Array<{ contact_id: string }>;
    };
    transformed = transformed.filter((title) => {
      const titleWithRaw = title as TitleWithRawAuthors;
      return (
        title.contact_id === filters.authorId ||
        title.authors?.some((a) => a.contactId === filters.authorId) ||
        // Check raw titleAuthors if authors not included
        titleWithRaw.titleAuthors?.some(
          (ta) => ta.contact_id === filters.authorId,
        )
      );
    });
  }

  // If searching by author name, filter results in memory
  // This is a tradeoff for simpler query structure
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    transformed = transformed.filter(
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
 * @param includeAuthors - Include full authors array (Story 10.1)
 * @returns Title with author or null if not found
 */
export async function getTitleById(
  id: string,
  includeAuthors: boolean = true,
): Promise<TitleWithAuthor | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Story 10.1: Include titleAuthors relation for multi-author support
  const title = await db.query.titles.findFirst({
    where: and(eq(titles.id, id), eq(titles.tenant_id, tenantId)),
    with: {
      contact: true, // Backward compat (deprecated)
      titleAuthors: {
        with: {
          contact: true,
        },
        orderBy: [
          desc(titleAuthors.is_primary),
          desc(titleAuthors.ownership_percentage),
        ],
      },
    },
  });

  if (!title) {
    return null;
  }

  // Get primary author from title_authors if available, fallback to legacy contact
  const primaryAuthor =
    title.titleAuthors?.find((ta) => ta.is_primary) || title.titleAuthors?.[0];

  // Build backward-compatible author object
  const author = primaryAuthor?.contact
    ? {
        id: primaryAuthor.contact.id,
        name: `${primaryAuthor.contact.first_name || ""} ${primaryAuthor.contact.last_name || ""}`.trim(),
        email: primaryAuthor.contact.email,
      }
    : title.contact
      ? {
          id: title.contact.id,
          name: `${title.contact.first_name || ""} ${title.contact.last_name || ""}`.trim(),
          email: title.contact.email,
        }
      : { id: "", name: "Unknown Author", email: null };

  // Build authors array (Story 10.1)
  const authors: TitleAuthorInfo[] | undefined = includeAuthors
    ? title.titleAuthors?.map((ta) => ({
        contactId: ta.contact_id,
        name: ta.contact
          ? `${ta.contact.first_name || ""} ${ta.contact.last_name || ""}`.trim()
          : "Unknown",
        email: ta.contact?.email || null,
        ownershipPercentage: ta.ownership_percentage,
        isPrimary: ta.is_primary,
      }))
    : undefined;

  return {
    ...title,
    author,
    authors,
    isCoAuthored: (title.titleAuthors?.length || 0) > 1,
  };
}
