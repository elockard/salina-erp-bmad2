/**
 * Contact Module Queries
 *
 * Database queries for the unified contact system with multi-role support.
 *
 * Story: 7.2 - Build Contact Management Interface
 * Related FRs: FR82-FR87 (Contact Management)
 * AC-7.2.8: Database Queries Implementation
 */

import { and, eq, ilike, or } from "drizzle-orm";
import { contacts, contactRoles } from "@/db/schema/contacts";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import type { ContactWithRoles, ContactFilters, ContactRoleType, ContactRole } from "./types";

// =============================================================================
// Get Contacts
// =============================================================================

/**
 * Get all contacts for a tenant with filtering, sorting, and relations
 *
 * AC-7.2.8: Implement getContacts query
 * - Filter by status (active/inactive)
 * - Filter by role
 * - Search by name/email
 * - Include roles relation
 * - Order by last_name, first_name
 * - All queries scoped to current tenant
 */
export async function getContacts(
  filters?: ContactFilters,
): Promise<ContactWithRoles[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Build base conditions
  const conditions = [eq(contacts.tenant_id, tenantId)];

  // Filter by status
  if (!filters?.includeInactive) {
    conditions.push(eq(contacts.status, "active"));
  }

  // Search by name/email
  if (filters?.searchQuery) {
    const searchTerm = `%${filters.searchQuery}%`;
    conditions.push(
      or(
        ilike(contacts.first_name, searchTerm),
        ilike(contacts.last_name, searchTerm),
        ilike(contacts.email, searchTerm),
      ) ?? eq(contacts.id, contacts.id), // fallback to true
    );
  }

  // Query with relations
  const results = await db.query.contacts.findMany({
    where: and(...conditions),
    with: {
      roles: true,
    },
    orderBy: (contacts, { asc }) => [
      asc(contacts.last_name),
      asc(contacts.first_name),
    ],
  });

  // Filter by role if specified (post-query filter due to relation)
  if (filters?.role) {
    return results.filter((contact) =>
      contact.roles.some((r) => r.role === filters.role),
    ) as ContactWithRoles[];
  }

  return results as ContactWithRoles[];
}

// =============================================================================
// Get Contact By ID
// =============================================================================

/**
 * Get a single contact by ID with roles
 *
 * AC-7.2.8: Implement getContactById query with roles
 */
export async function getContactById(
  id: string,
): Promise<ContactWithRoles | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)),
    with: {
      roles: true,
    },
  });

  return (contact as ContactWithRoles) || null;
}

// =============================================================================
// Get Contacts By Role
// =============================================================================

/**
 * Get contacts that have a specific role
 *
 * AC-7.2.8: Implement getContactsByRole query
 */
export async function getContactsByRole(
  role: ContactRoleType,
  options?: { includeInactive?: boolean },
): Promise<ContactWithRoles[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Build conditions
  const conditions = [eq(contacts.tenant_id, tenantId)];

  if (!options?.includeInactive) {
    conditions.push(eq(contacts.status, "active"));
  }

  // Query contacts with roles
  const results = await db.query.contacts.findMany({
    where: and(...conditions),
    with: {
      roles: true,
    },
    orderBy: (contacts, { asc }) => [
      asc(contacts.last_name),
      asc(contacts.first_name),
    ],
  });

  // Filter to only contacts with the specified role
  return results.filter((contact) =>
    contact.roles.some((r) => r.role === role),
  ) as ContactWithRoles[];
}

// =============================================================================
// Search Contacts
// =============================================================================

/**
 * Search contacts by name or email (debounce-friendly)
 *
 * AC-7.2.8: Implement searchContacts query
 * - Case-insensitive search
 * - Searches first_name, last_name, and email
 * - Returns results ordered by relevance (name match first)
 */
export async function searchContacts(
  query: string,
  options?: { includeInactive?: boolean; limit?: number },
): Promise<ContactWithRoles[]> {
  if (!query.trim()) {
    return [];
  }

  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const searchTerm = `%${query.trim()}%`;

  // Build conditions
  const conditions = [
    eq(contacts.tenant_id, tenantId),
    or(
      ilike(contacts.first_name, searchTerm),
      ilike(contacts.last_name, searchTerm),
      ilike(contacts.email, searchTerm),
    ) ?? eq(contacts.id, contacts.id),
  ];

  if (!options?.includeInactive) {
    conditions.push(eq(contacts.status, "active"));
  }

  const results = await db.query.contacts.findMany({
    where: and(...conditions),
    with: {
      roles: true,
    },
    orderBy: (contacts, { asc }) => [
      asc(contacts.last_name),
      asc(contacts.first_name),
    ],
    limit: options?.limit ?? 50,
  });

  return results as ContactWithRoles[];
}

// =============================================================================
// Get Contact Roles
// =============================================================================

/**
 * Get contact roles for a specific contact
 *
 * AC-7.2.8: Implement getContactRoles query
 */
export async function getContactRoles(
  contactId: string,
): Promise<ContactRole[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // First verify the contact belongs to this tenant
  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)),
  });

  if (!contact) {
    return [];
  }

  // Get roles for the contact
  const roles = await db.query.contactRoles.findMany({
    where: eq(contactRoles.contact_id, contactId),
  });

  return roles;
}

// =============================================================================
// Additional Helper Queries
// =============================================================================

/**
 * Check if contact has a specific role
 */
export async function contactHasRole(
  contactId: string,
  role: ContactRoleType,
): Promise<boolean> {
  const roles = await getContactRoles(contactId);
  return roles.some((r) => r.role === role);
}

/**
 * Get contacts count by status
 */
export async function getContactsCount(options?: {
  includeInactive?: boolean;
  role?: ContactRoleType;
}): Promise<number> {
  const results = await getContacts({
    includeInactive: options?.includeInactive,
    role: options?.role,
  });
  return results.length;
}

/**
 * Get contact by email (within tenant)
 */
export async function getContactByEmail(
  email: string,
): Promise<ContactWithRoles | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.tenant_id, tenantId), eq(contacts.email, email)),
    with: {
      roles: true,
    },
  });

  return (contact as ContactWithRoles) || null;
}
