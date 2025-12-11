/**
 * Contact Module Queries
 *
 * Database queries for the unified contact system with multi-role support.
 *
 * Story: 7.2 - Build Contact Management Interface
 * Related FRs: FR82-FR87 (Contact Management)
 * AC-7.2.8: Database Queries Implementation
 */

import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { contactRoles, contacts } from "@/db/schema/contacts";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import type {
  ContactFilters,
  ContactRole,
  ContactRoleType,
  ContactWithRoles,
} from "./types";

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

// =============================================================================
// Tax Information Queries (Story 11.1)
// =============================================================================

/**
 * Get US-based authors missing TIN information
 *
 * Story 11.1 - AC-11.1.10: Missing TIN Warning Indicators
 * Returns active, US-based contacts with author role who are missing TIN.
 * Used for 1099 compliance reporting and warning indicators.
 */
export async function getAuthorsWithMissingTIN(): Promise<ContactWithRoles[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Query all active, US-based contacts without TIN
  const results = await db.query.contacts.findMany({
    where: and(
      eq(contacts.tenant_id, tenantId),
      eq(contacts.status, "active"),
      eq(contacts.is_us_based, true),
      isNull(contacts.tin_encrypted),
    ),
    with: {
      roles: true,
    },
    orderBy: (contacts, { asc }) => [
      asc(contacts.last_name),
      asc(contacts.first_name),
    ],
  });

  // Filter to only contacts with author role
  return results.filter((contact) =>
    contact.roles.some((r) => r.role === "author"),
  ) as ContactWithRoles[];
}

/**
 * Get contacts with missing W-9 information
 *
 * Story 11.1 - AC-11.1.7: W-9 Form Tracking
 * Returns US-based contacts who have TIN but no W-9 on file.
 */
export async function getContactsWithMissingW9(): Promise<ContactWithRoles[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const results = await db.query.contacts.findMany({
    where: and(
      eq(contacts.tenant_id, tenantId),
      eq(contacts.status, "active"),
      eq(contacts.is_us_based, true),
      // Has TIN but no W-9
      eq(contacts.w9_received, false),
    ),
    with: {
      roles: true,
    },
    orderBy: (contacts, { asc }) => [
      asc(contacts.last_name),
      asc(contacts.first_name),
    ],
  });

  // Filter to only those with TIN (need W-9 for tax reporting)
  return results.filter(
    (contact) => contact.tin_encrypted !== null,
  ) as ContactWithRoles[];
}

/**
 * Tax status summary for a contact
 */
export interface ContactTaxStatus {
  contactId: string;
  hasTIN: boolean;
  tinType: "ssn" | "ein" | null;
  tinLastFour: string | null;
  isUSBased: boolean;
  hasW9: boolean;
  w9ReceivedDate: Date | null;
  isComplete: boolean;
}

/**
 * Get tax status for a specific contact
 *
 * Story 11.1 - AC-11.1.9: Tax Information Display
 * Returns summary of tax information completeness.
 */
export async function getContactTaxStatus(
  contactId: string,
): Promise<ContactTaxStatus | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)),
  });

  if (!contact) {
    return null;
  }

  const hasTIN = contact.tin_encrypted !== null;
  const isUSBased = contact.is_us_based ?? true;
  const hasW9 = contact.w9_received ?? false;

  // Tax info is complete if:
  // - Non-US based (no TIN/W-9 required), OR
  // - US-based with TIN and W-9
  const isComplete = !isUSBased || (hasTIN && hasW9);

  return {
    contactId: contact.id,
    hasTIN,
    tinType: (contact.tin_type as "ssn" | "ein") ?? null,
    tinLastFour: contact.tin_last_four ?? null,
    isUSBased,
    hasW9,
    w9ReceivedDate: contact.w9_received_date ?? null,
    isComplete,
  };
}

/**
 * Get count of authors needing tax information
 *
 * Story 11.1 - AC-11.1.10: Dashboard warning counts
 */
export async function getAuthorsMissingTINCount(): Promise<number> {
  const authors = await getAuthorsWithMissingTIN();
  return authors.length;
}

/**
 * Get count of contacts missing W-9
 *
 * Story 11.1 - AC-11.1.10: Dashboard warning counts
 */
export async function getContactsMissingW9Count(): Promise<number> {
  const contacts = await getContactsWithMissingW9();
  return contacts.length;
}
