/**
 * @deprecated This module is deprecated. Use `@/modules/contacts` instead.
 *
 * Authors Queries (Contact-Based)
 *
 * Story 7.3: Migrate Authors to Contacts
 * Story 0.5: Consolidate Authors into Contacts
 *
 * Authors are now contacts with role='author' in the contact_roles table.
 * All new code should use the contacts module directly:
 *   - import { getContacts, getContactById } from "@/modules/contacts/queries"
 *   - Filter by role='author' when querying contacts
 *
 * This module is maintained for backward compatibility only.
 * See queries-legacy.ts for original authors table queries.
 */

import { and, asc, eq, ilike, or } from "drizzle-orm";
import { contactRoles, contacts } from "@/db/schema/contacts";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import { decryptTaxId, maskTaxId } from "@/lib/encryption";
import type { Author, AuthorFilters, AuthorWithTitles } from "./types";

/**
 * Get all authors (contacts with author role) for current tenant
 * @param filters - Optional filtering options
 * @returns Array of authors (sorted alphabetically by name)
 */
export async function getAuthors(filters?: AuthorFilters): Promise<Author[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const conditions = [eq(contacts.tenant_id, tenantId)];

  // Filter inactive unless explicitly included
  if (!filters?.includeInactive) {
    conditions.push(eq(contacts.status, "active"));
  }

  // Search filter (case-insensitive on name and email)
  if (filters?.searchQuery) {
    const searchTerm = `%${filters.searchQuery}%`;
    const searchCondition = or(
      ilike(contacts.first_name, searchTerm),
      ilike(contacts.last_name, searchTerm),
      ilike(contacts.email, searchTerm),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  // Query contacts with author role
  const result = await db.query.contacts.findMany({
    where: and(...conditions),
    with: {
      roles: true,
    },
    orderBy: [asc(contacts.last_name), asc(contacts.first_name)],
  });

  // Filter to only contacts with author role and map to Author type
  const authorsOnly = result.filter((c) =>
    c.roles.some((r) => r.role === "author"),
  );

  return authorsOnly.map(contactToAuthor);
}

/**
 * Get a single author by ID with related titles
 * @param id - Contact UUID (author)
 * @returns Author with titles or null if not found
 */
export async function getAuthorById(
  id: string,
): Promise<AuthorWithTitles | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)),
    with: {
      roles: true,
      titles: true,
    },
  });

  if (!contact) {
    return null;
  }

  // Verify contact has author role
  if (!contact.roles.some((r) => r.role === "author")) {
    return null;
  }

  const author = contactToAuthor(contact);

  return {
    ...author,
    titles: contact.titles.map((t) => ({
      id: t.id,
      title: t.title,
      publication_status: t.publication_status,
    })),
  };
}

/**
 * Get author with decrypted tax ID (for authorized roles only)
 * This should only be called after permission check for VIEW_TAX_ID roles
 *
 * @param id - Contact UUID (author)
 * @returns Author with decrypted tax_id or null
 */
export async function getAuthorWithDecryptedTaxId(
  id: string,
): Promise<Author | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)),
    with: {
      roles: true,
    },
  });

  if (!contact) {
    return null;
  }

  // Verify contact has author role
  if (!contact.roles.some((r) => r.role === "author")) {
    return null;
  }

  const author = contactToAuthor(contact);

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

/**
 * Get author display name (combines first_name and last_name)
 * @param author - Author record
 * @returns Display name string
 */
export function getAuthorDisplayName(author: Author): string {
  const name = `${author.first_name || ""} ${author.last_name || ""}`.trim();
  return name || author.email || "Unknown";
}

/**
 * Convert a contact with author role to Author type
 * Maps contact fields to legacy Author structure for backward compatibility
 *
 * @param contact - Contact with roles
 * @returns Author-compatible object
 */
function contactToAuthor(
  contact: typeof contacts.$inferSelect & {
    roles?: (typeof contactRoles.$inferSelect)[];
  },
): Author {
  // Extract author role data if present
  const authorRole = contact.roles?.find((r) => r.role === "author");
  const _roleData = authorRole?.role_specific_data as Record<
    string,
    unknown
  > | null;

  // Convert payment_info JSONB to payment_method string
  const paymentInfo = contact.payment_info as { method?: string } | null;
  const paymentMethod = paymentInfo?.method || null;

  return {
    id: contact.id,
    tenant_id: contact.tenant_id,
    // Combine first_name and last_name for legacy 'name' field
    name: `${contact.first_name || ""} ${contact.last_name || ""}`.trim(),
    email: contact.email,
    phone: contact.phone,
    address: contact.address_line1,
    tax_id: contact.tax_id,
    payment_method: paymentMethod,
    portal_user_id: contact.portal_user_id,
    is_active: contact.status === "active",
    created_at: contact.created_at,
    updated_at: contact.updated_at,
    // Contact-specific fields (for gradual migration)
    first_name: contact.first_name,
    last_name: contact.last_name,
    contact_id: contact.id, // Self-reference for compatibility
  };
}

/**
 * Check if a contact has author role
 * @param contactId - Contact UUID
 * @returns boolean
 */
export async function hasAuthorRole(contactId: string): Promise<boolean> {
  const db = await getDb();

  const role = await db.query.contactRoles.findFirst({
    where: and(
      eq(contactRoles.contact_id, contactId),
      eq(contactRoles.role, "author"),
    ),
  });

  return role !== null;
}

/**
 * Get author by portal user ID (for portal authentication)
 * @param portalUserId - User UUID linked to contact
 * @returns Author or null
 */
export async function getAuthorByPortalUserId(
  portalUserId: string,
): Promise<Author | null> {
  const db = await getDb();

  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.portal_user_id, portalUserId),
      eq(contacts.status, "active"),
    ),
    with: {
      roles: true,
    },
  });

  if (!contact) {
    return null;
  }

  // Verify contact has author role
  if (!contact.roles.some((r) => r.role === "author")) {
    return null;
  }

  return contactToAuthor(contact);
}
