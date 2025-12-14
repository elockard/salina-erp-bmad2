/**
 * Title Authors Module Query Functions
 *
 * Server-side queries for title-author relationships.
 * Provides functions to retrieve authors for titles and titles for authors.
 *
 * Story: 10.1 - Add Multiple Authors Per Title with Ownership Percentages
 * Related FRs: FR111 (Multiple authors per title), FR118 (Co-author relationship history)
 *
 * AC-10.1.3: Backward compatibility for single-author titles
 * AC-10.1.7: Author view of co-authored titles
 */

"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { contactRoles, contacts } from "@/db/schema/contacts";
import { titleAuthors } from "@/db/schema/title-authors";
import { titles } from "@/db/schema/titles";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import type { TitleAuthorWithContact } from "./types";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Title with all authors including ownership details
 *
 * Story 14.3: Added accessibility metadata fields for ONIX export
 */
export interface TitleWithAuthors {
  id: string;
  title: string;
  subtitle: string | null;
  isbn: string | null;
  tenant_id: string;
  publication_status: string | null;
  created_at: Date;
  updated_at: Date;
  authors: TitleAuthorWithContact[];
  primaryAuthor: TitleAuthorWithContact | null;
  isSoleAuthor: boolean;
  // Accessibility metadata (Story 14.3 - Codelist 196)
  epub_accessibility_conformance: string | null;
  accessibility_features: string[] | null;
  accessibility_hazards: string[] | null;
  accessibility_summary: string | null;
}

/**
 * Author's title with ownership info (for author portal)
 */
export interface AuthorTitleInfo {
  titleId: string;
  title: string;
  isbn: string | null;
  publicationStatus: string | null;
  ownershipPercentage: string;
  isPrimary: boolean;
  isCoAuthored: boolean;
  coAuthorCount: number;
}

/**
 * Contact with author role for selector
 */
export interface AuthorContact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  email: string | null;
  penName: string | null;
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get all authors for a title with their ownership percentages
 *
 * @param titleId - UUID of the title
 * @returns Array of title authors with contact details
 */
export async function getTitleAuthors(
  titleId: string,
): Promise<TitleAuthorWithContact[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Verify title belongs to tenant
  const [title] = await db
    .select({ id: titles.id })
    .from(titles)
    .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)));

  if (!title) {
    return [];
  }

  // Get title authors with contact info
  const result = await db.query.titleAuthors.findMany({
    where: eq(titleAuthors.title_id, titleId),
    with: {
      contact: true,
    },
    orderBy: [
      // Primary author first, then by ownership percentage descending
      desc(titleAuthors.is_primary),
      desc(titleAuthors.ownership_percentage),
    ],
  });

  return result as TitleAuthorWithContact[];
}

/**
 * Get all titles for a specific author/contact with ownership info
 * Used for author portal view (AC-10.1.7)
 *
 * @param contactId - UUID of the contact (author)
 * @returns Array of author's titles with ownership details
 */
export async function getAuthorTitles(
  contactId: string,
): Promise<AuthorTitleInfo[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Verify contact belongs to tenant
  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)));

  if (!contact) {
    return [];
  }

  // Get all title_author entries for this contact
  const authorEntries = await db.query.titleAuthors.findMany({
    where: eq(titleAuthors.contact_id, contactId),
    with: {
      title: true,
    },
  });

  // Filter to tenant's titles only
  const validEntries = authorEntries.filter(
    (entry) => entry.title && entry.title.tenant_id === tenantId,
  );

  if (validEntries.length === 0) {
    return [];
  }

  // Batch query: Get co-author counts for all titles in one query
  const titleIds = validEntries.map((e) => e.title_id);
  const coAuthorCounts = await db
    .select({
      titleId: titleAuthors.title_id,
      count: sql<number>`count(*)::int`,
    })
    .from(titleAuthors)
    .where(inArray(titleAuthors.title_id, titleIds))
    .groupBy(titleAuthors.title_id);

  // Create lookup map for O(1) access
  const countMap = new Map(coAuthorCounts.map((c) => [c.titleId, c.count]));

  // Build result using the lookup map (no N+1 queries)
  return validEntries.map((entry) => ({
    titleId: entry.title_id,
    title: entry.title?.title,
    isbn: entry.title?.isbn,
    publicationStatus: entry.title?.publication_status,
    ownershipPercentage: entry.ownership_percentage,
    isPrimary: entry.is_primary,
    isCoAuthored: (countMap.get(entry.title_id) || 1) > 1,
    coAuthorCount: countMap.get(entry.title_id) || 1,
  }));
}

/**
 * Get a title with all author details
 * Full title + authors view for editing
 *
 * @param titleId - UUID of the title
 * @returns Title with authors or null if not found
 */
export async function getTitleWithAuthors(
  titleId: string,
): Promise<TitleWithAuthors | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Get title with tenant check
  const title = await db.query.titles.findFirst({
    where: and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)),
  });

  if (!title) {
    return null;
  }

  // Get all authors for this title
  const authors = await getTitleAuthors(titleId);

  // Find primary author
  const primaryAuthor = authors.find((a) => a.is_primary) || null;

  return {
    id: title.id,
    title: title.title,
    subtitle: title.subtitle,
    isbn: title.isbn,
    tenant_id: title.tenant_id,
    publication_status: title.publication_status,
    created_at: title.created_at,
    updated_at: title.updated_at,
    authors,
    primaryAuthor,
    isSoleAuthor: authors.length === 1,
    // Accessibility metadata (Story 14.3)
    epub_accessibility_conformance: title.epub_accessibility_conformance,
    accessibility_features: title.accessibility_features,
    accessibility_hazards: title.accessibility_hazards,
    accessibility_summary: title.accessibility_summary,
  };
}

/**
 * Get contacts with author role for the author selector
 * Used in title edit form to select authors (AC-10.1.4)
 *
 * @returns Array of contacts with author role
 */
export async function getContactsWithAuthorRole(): Promise<AuthorContact[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Get contacts with 'author' role via contact_roles table
  // pen_name is stored in role_specific_data JSONB field
  const authorRoles = await db
    .select({
      contactId: contactRoles.contact_id,
      roleData: contactRoles.role_specific_data,
    })
    .from(contactRoles)
    .where(eq(contactRoles.role, "author"));

  if (authorRoles.length === 0) {
    return [];
  }

  // Get contact details for author contacts
  const contactIds = authorRoles.map((r) => r.contactId);
  // Extract pen_name from role_specific_data JSONB
  const penNameMap = new Map(
    authorRoles.map((r) => {
      const data = r.roleData as { pen_name?: string } | null;
      return [r.contactId, data?.pen_name || null];
    }),
  );

  const authorContacts = await db.query.contacts.findMany({
    where: eq(contacts.tenant_id, tenantId),
  });

  // Filter to only contacts with author role and build response
  const result: AuthorContact[] = authorContacts
    .filter((c) => contactIds.includes(c.id))
    .map((c) => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      displayName:
        `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
        c.email ||
        "Unknown",
      email: c.email,
      penName: penNameMap.get(c.id) || null,
    }));

  // Sort by display name
  result.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return result;
}

/**
 * Check if a contact is an author on a specific title
 *
 * @param titleId - UUID of the title
 * @param contactId - UUID of the contact
 * @returns Boolean indicating if contact is an author
 */
export async function isAuthorOnTitle(
  titleId: string,
  contactId: string,
): Promise<boolean> {
  const db = await getDb();

  const [existing] = await db
    .select({ id: titleAuthors.id })
    .from(titleAuthors)
    .where(
      and(
        eq(titleAuthors.title_id, titleId),
        eq(titleAuthors.contact_id, contactId),
      ),
    );

  return !!existing;
}

/**
 * Get the primary author for a title
 * Backward compatibility helper for single-author views
 *
 * @param titleId - UUID of the title
 * @returns Primary author with contact or null
 */
export async function getTitlePrimaryAuthor(
  titleId: string,
): Promise<TitleAuthorWithContact | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Verify title belongs to tenant
  const [title] = await db
    .select({ id: titles.id })
    .from(titles)
    .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)));

  if (!title) {
    return null;
  }

  // Get primary author
  const primary = await db.query.titleAuthors.findFirst({
    where: and(
      eq(titleAuthors.title_id, titleId),
      eq(titleAuthors.is_primary, true),
    ),
    with: {
      contact: true,
    },
  });

  if (!primary) {
    // Fallback: get first author if no primary is set
    const first = await db.query.titleAuthors.findFirst({
      where: eq(titleAuthors.title_id, titleId),
      with: {
        contact: true,
      },
      orderBy: desc(titleAuthors.ownership_percentage),
    });
    return first as TitleAuthorWithContact | null;
  }

  return primary as TitleAuthorWithContact;
}

/**
 * Get total ownership percentage sum for a title
 * Utility for validation displays
 *
 * @param titleId - UUID of the title
 * @returns Object with total percentage and validity
 */
export async function getTitleOwnershipSum(
  titleId: string,
): Promise<{ total: string; isValid: boolean }> {
  const db = await getDb();
  const Decimal = (await import("decimal.js")).default;

  const authors = await db
    .select({ percentage: titleAuthors.ownership_percentage })
    .from(titleAuthors)
    .where(eq(titleAuthors.title_id, titleId));

  if (authors.length === 0) {
    return { total: "0", isValid: false };
  }

  const total = authors.reduce(
    (sum, a) => sum.plus(new Decimal(a.percentage)),
    new Decimal(0),
  );

  return {
    total: total.toString(),
    isValid: total.equals(100),
  };
}

// =============================================================================
// Admin Functions (for background jobs)
// =============================================================================

/**
 * Get title with authors - Admin version for Inngest background jobs
 *
 * Story 16.2: Required for feed generation without HTTP request context.
 * Uses adminDb to bypass RLS since Inngest jobs run outside authenticated sessions.
 *
 * @param titleId - UUID of the title
 * @param tenantId - UUID of the tenant (required since no RLS context)
 * @returns Title with authors or null if not found
 */
export async function getTitleWithAuthorsAdmin(
  titleId: string,
  tenantId: string,
): Promise<TitleWithAuthors | null> {
  const { adminDb } = await import("@/db");

  // Get title with explicit tenant check
  const title = await adminDb.query.titles.findFirst({
    where: and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)),
  });

  if (!title) {
    return null;
  }

  // Get all authors for this title
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

  // Find primary author
  const primaryAuthor =
    (authors.find((a) => a.is_primary) as TitleAuthorWithContact) || null;

  return {
    id: title.id,
    title: title.title,
    subtitle: title.subtitle,
    isbn: title.isbn,
    tenant_id: title.tenant_id,
    publication_status: title.publication_status,
    created_at: title.created_at,
    updated_at: title.updated_at,
    authors: authors as TitleAuthorWithContact[],
    primaryAuthor,
    isSoleAuthor: authors.length === 1,
    // Accessibility metadata (Story 14.3)
    epub_accessibility_conformance: title.epub_accessibility_conformance,
    accessibility_features: title.accessibility_features,
    accessibility_hazards: title.accessibility_hazards,
    accessibility_summary: title.accessibility_summary,
  };
}
