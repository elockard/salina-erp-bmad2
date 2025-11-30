import { and, asc, eq, ilike, or } from "drizzle-orm";
import { authors } from "@/db/schema/authors";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import { decryptTaxId, maskTaxId } from "@/lib/encryption";
import type { Author, AuthorFilters, AuthorWithTitles } from "./types";

/**
 * Get all authors for the current tenant
 * @param filters - Optional filtering options
 * @returns Array of authors (sorted alphabetically by name)
 */
export async function getAuthors(filters?: AuthorFilters): Promise<Author[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const conditions = [eq(authors.tenant_id, tenantId)];

  // Filter inactive unless explicitly included
  if (!filters?.includeInactive) {
    conditions.push(eq(authors.is_active, true));
  }

  // Search filter (case-insensitive on name and email)
  if (filters?.searchQuery) {
    const searchTerm = `%${filters.searchQuery}%`;
    const searchCondition = or(
      ilike(authors.name, searchTerm),
      ilike(authors.email, searchTerm),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const result = await db.query.authors.findMany({
    where: and(...conditions),
    orderBy: asc(authors.name),
  });

  return result;
}

/**
 * Get a single author by ID with related titles
 * @param id - Author UUID
 * @returns Author with titles or null if not found
 */
export async function getAuthorById(
  id: string,
): Promise<AuthorWithTitles | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const author = await db.query.authors.findFirst({
    where: and(eq(authors.id, id), eq(authors.tenant_id, tenantId)),
  });

  if (!author) {
    return null;
  }

  // TODO: Once titles table exists (Story 2.4), add relation query
  // For now, return empty titles array
  return {
    ...author,
    titles: [],
  };
}

/**
 * Get author with decrypted tax ID (for authorized roles only)
 * This should only be called after permission check for VIEW_TAX_ID roles
 *
 * @param id - Author UUID
 * @returns Author with decrypted tax_id or null
 */
export async function getAuthorWithDecryptedTaxId(
  id: string,
): Promise<Author | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const author = await db.query.authors.findFirst({
    where: and(eq(authors.id, id), eq(authors.tenant_id, tenantId)),
  });

  if (!author) {
    return null;
  }

  // Decrypt tax_id if present
  if (author.tax_id) {
    try {
      const decrypted = decryptTaxId(author.tax_id);
      return { ...author, tax_id: decrypted };
    } catch {
      // If decryption fails (data not encrypted or corrupted), return as-is
      console.error("Failed to decrypt tax_id for author:", id);
      return author;
    }
  }

  return author;
}

/**
 * Get masked tax ID for display (safe for all roles)
 * @param taxId - Encrypted or plain tax ID
 * @returns Masked tax ID string (e.g., "***-**-1234")
 */
export function getMaskedTaxId(taxId: string | null): string {
  if (!taxId) {
    return "";
  }

  try {
    const decrypted = decryptTaxId(taxId);
    return maskTaxId(decrypted);
  } catch {
    // If decryption fails, mask the raw value
    return maskTaxId(taxId);
  }
}
