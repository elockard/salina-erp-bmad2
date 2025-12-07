/**
 * Contact Module Server Actions
 *
 * Server actions for the unified contact system with multi-role support.
 *
 * Story: 7.2 - Build Contact Management Interface
 * Related FRs: FR82-FR87 (Contact Management)
 * ACs: AC-7.2.5, AC-7.2.6, AC-7.2.7
 */

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contacts, contactRoles } from "@/db/schema/contacts";
import { getCurrentTenantId, getCurrentUser, getDb, requirePermission } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import {
  MANAGE_CONTACTS,
  ASSIGN_CUSTOMER_ROLE,
  MANAGE_USERS,
} from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import {
  createContactSchema,
  updateContactSchema,
  assignContactRoleSchema,
  type CreateContactInput,
  type UpdateContactInput,
  type AssignContactRoleInput,
} from "./schema";
import type { ContactWithRoles, ContactRoleType } from "./types";

// =============================================================================
// SECURITY WARNING: Payment Info Handling
// =============================================================================
// The payment_info JSONB field may contain sensitive data (routing_number).
// Per Dev Notes from Story 7.1: "routing_number in PaymentInfo must be encrypted
// at app level" - encryption should be implemented at the application layer
// before storing routing numbers. This is a known security consideration for
// a future enhancement.
// =============================================================================

// =============================================================================
// Create Contact
// =============================================================================

/**
 * Create a new contact
 * Permission: MANAGE_CONTACTS (owner, admin, editor)
 *
 * AC-7.2.7: Implement createContact action
 * - Validate input with createContactSchema
 * - Check MANAGE_CONTACTS permission
 * - Insert contact record
 * - Insert contact_roles records for each selected role
 * - Return created contact with roles
 */
export async function createContact(
  data: CreateContactInput,
  roles?: AssignContactRoleInput[],
): Promise<ActionResult<ContactWithRoles>> {
  try {
    // Check permission
    await requirePermission(MANAGE_CONTACTS);

    // Validate input
    const validated = createContactSchema.parse(data);

    // Get tenant context and user
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Insert contact
    const [contact] = await db
      .insert(contacts)
      .values({
        tenant_id: tenantId,
        first_name: validated.first_name,
        last_name: validated.last_name,
        email: validated.email || null,
        phone: validated.phone || null,
        address_line1: validated.address_line1 || null,
        address_line2: validated.address_line2 || null,
        city: validated.city || null,
        state: validated.state || null,
        postal_code: validated.postal_code || null,
        country: validated.country || null,
        tax_id: validated.tax_id || null,
        payment_info: validated.payment_info || null,
        notes: validated.notes || null,
        status: validated.status || "active",
        created_by: user?.id,
      })
      .returning();

    // Insert roles if provided
    const createdRoles = [];
    if (roles && roles.length > 0) {
      for (const roleData of roles) {
        // Validate role assignment
        const validatedRole = assignContactRoleSchema.parse(roleData);

        // Check customer role assignment permission
        if (validatedRole.role === "customer") {
          try {
            await requirePermission(ASSIGN_CUSTOMER_ROLE);
          } catch {
            // Skip customer role if user doesn't have permission
            continue;
          }
        }

        const [role] = await db
          .insert(contactRoles)
          .values({
            contact_id: contact.id,
            role: validatedRole.role,
            role_specific_data: validatedRole.role_specific_data || null,
            assigned_by: user?.id,
          })
          .returning();
        createdRoles.push(role);
      }
    }

    // Fire and forget audit log
    logAuditEvent({
      tenantId,
      userId: user?.id || null,
      actionType: "CREATE",
      resourceType: "contact",
      resourceId: contact.id,
      changes: { after: contact },
    });

    // Revalidate cache
    revalidatePath("/contacts");

    return {
      success: true,
      data: { ...contact, roles: createdRoles },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage contacts",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    // Handle unique constraint violation (email uniqueness per tenant)
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return {
        success: false,
        error: "A contact with this email already exists",
      };
    }

    console.error("createContact error:", error);
    return {
      success: false,
      error: "Failed to create contact. Please try again.",
    };
  }
}

// =============================================================================
// Update Contact
// =============================================================================

/**
 * Update an existing contact
 * Permission: MANAGE_CONTACTS (owner, admin, editor)
 *
 * AC-7.2.7: Implement updateContact action
 * - Validate input with updateContactSchema
 * - Check permissions
 * - Handle email uniqueness constraint error
 * - Update contact record
 */
export async function updateContact(
  id: string,
  data: UpdateContactInput,
): Promise<ActionResult<ContactWithRoles>> {
  try {
    // Check permission
    await requirePermission(MANAGE_CONTACTS);

    // Validate input
    const validated = updateContactSchema.parse(data);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Get existing contact
    const existing = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)),
      with: { roles: true },
    });

    if (!existing) {
      return { success: false, error: "Contact not found" };
    }

    // Prepare update values
    const updateValues: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (validated.first_name !== undefined) {
      updateValues.first_name = validated.first_name;
    }
    if (validated.last_name !== undefined) {
      updateValues.last_name = validated.last_name;
    }
    if (validated.email !== undefined) {
      updateValues.email = validated.email || null;
    }
    if (validated.phone !== undefined) {
      updateValues.phone = validated.phone || null;
    }
    if (validated.address_line1 !== undefined) {
      updateValues.address_line1 = validated.address_line1 || null;
    }
    if (validated.address_line2 !== undefined) {
      updateValues.address_line2 = validated.address_line2 || null;
    }
    if (validated.city !== undefined) {
      updateValues.city = validated.city || null;
    }
    if (validated.state !== undefined) {
      updateValues.state = validated.state || null;
    }
    if (validated.postal_code !== undefined) {
      updateValues.postal_code = validated.postal_code || null;
    }
    if (validated.country !== undefined) {
      updateValues.country = validated.country || null;
    }
    if (validated.tax_id !== undefined) {
      updateValues.tax_id = validated.tax_id || null;
    }
    if (validated.payment_info !== undefined) {
      updateValues.payment_info = validated.payment_info || null;
    }
    if (validated.notes !== undefined) {
      updateValues.notes = validated.notes || null;
    }
    if (validated.status !== undefined) {
      updateValues.status = validated.status;
    }

    // Update contact
    const [updated] = await db
      .update(contacts)
      .set(updateValues)
      .where(and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)))
      .returning();

    // Get updated contact with roles
    const contactWithRoles = await db.query.contacts.findFirst({
      where: eq(contacts.id, id),
      with: { roles: true },
    });

    // Fire and forget audit log
    logAuditEvent({
      tenantId,
      userId: user?.id || null,
      actionType: "UPDATE",
      resourceType: "contact",
      resourceId: id,
      changes: { before: existing, after: updated },
    });

    // Revalidate cache
    revalidatePath("/contacts");

    return {
      success: true,
      data: contactWithRoles as ContactWithRoles,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage contacts",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    // Handle unique constraint violation
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return {
        success: false,
        error: "A contact with this email already exists",
      };
    }

    console.error("updateContact error:", error);
    return {
      success: false,
      error: "Failed to update contact. Please try again.",
    };
  }
}

// =============================================================================
// Deactivate Contact
// =============================================================================

/**
 * Deactivate a contact (soft delete)
 * Permission: MANAGE_USERS (owner, admin only)
 *
 * AC-7.2.7: Implement deactivateContact action
 * - Set status to 'inactive'
 * - Only Admin/Owner can deactivate
 */
export async function deactivateContact(
  id: string,
): Promise<ActionResult<ContactWithRoles>> {
  try {
    // Only admin/owner can deactivate
    await requirePermission(MANAGE_USERS);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Get existing contact
    const existing = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)),
    });

    if (!existing) {
      return { success: false, error: "Contact not found" };
    }

    // Update contact status
    await db
      .update(contacts)
      .set({
        status: "inactive",
        updated_at: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)));

    // Get updated contact with roles
    const contactWithRoles = await db.query.contacts.findFirst({
      where: eq(contacts.id, id),
      with: { roles: true },
    });

    // Fire and forget audit log
    logAuditEvent({
      tenantId,
      userId: user?.id || null,
      actionType: "DELETE",
      resourceType: "contact",
      resourceId: id,
      changes: { before: existing },
    });

    // Revalidate cache
    revalidatePath("/contacts");

    return {
      success: true,
      data: contactWithRoles as ContactWithRoles,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to deactivate contacts",
      };
    }

    console.error("deactivateContact error:", error);
    return {
      success: false,
      error: "Failed to deactivate contact. Please try again.",
    };
  }
}

/**
 * Reactivate a contact
 * Permission: MANAGE_USERS (owner, admin only)
 */
export async function reactivateContact(
  id: string,
): Promise<ActionResult<ContactWithRoles>> {
  try {
    // Only admin/owner can reactivate
    await requirePermission(MANAGE_USERS);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Update contact status
    await db
      .update(contacts)
      .set({
        status: "active",
        updated_at: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)));

    // Get updated contact with roles
    const contactWithRoles = await db.query.contacts.findFirst({
      where: eq(contacts.id, id),
      with: { roles: true },
    });

    if (!contactWithRoles) {
      return { success: false, error: "Contact not found" };
    }

    // Revalidate cache
    revalidatePath("/contacts");

    return {
      success: true,
      data: contactWithRoles as ContactWithRoles,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to reactivate contacts",
      };
    }

    console.error("reactivateContact error:", error);
    return {
      success: false,
      error: "Failed to reactivate contact. Please try again.",
    };
  }
}

// =============================================================================
// Assign Contact Role
// =============================================================================

/**
 * Assign a role to a contact
 * Permission: MANAGE_CONTACTS (owner, admin, editor) for author role
 * Permission: ASSIGN_CUSTOMER_ROLE (owner, admin, finance) for customer role
 *
 * AC-7.2.7: Implement assignContactRole action
 * - Validate role assignment permissions
 * - Insert into contact_roles
 * - Handle unique constraint (role already assigned)
 */
export async function assignContactRole(
  contactId: string,
  roleData: AssignContactRoleInput,
): Promise<ActionResult<ContactWithRoles>> {
  try {
    // Check base permission
    await requirePermission(MANAGE_CONTACTS);

    // Check customer role assignment permission
    if (roleData.role === "customer") {
      await requirePermission(ASSIGN_CUSTOMER_ROLE);
    }

    // Validate input
    const validated = assignContactRoleSchema.parse(roleData);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Verify contact exists and belongs to tenant
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)),
    });

    if (!contact) {
      return { success: false, error: "Contact not found" };
    }

    // Insert role
    await db.insert(contactRoles).values({
      contact_id: contactId,
      role: validated.role,
      role_specific_data: validated.role_specific_data || null,
      assigned_by: user?.id,
    });

    // Get updated contact with roles
    const contactWithRoles = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
      with: { roles: true },
    });

    // Revalidate cache
    revalidatePath("/contacts");

    return {
      success: true,
      data: contactWithRoles as ContactWithRoles,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to assign this role",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    // Handle unique constraint violation (role already assigned)
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return {
        success: false,
        error: "This role is already assigned to the contact",
      };
    }

    console.error("assignContactRole error:", error);
    return {
      success: false,
      error: "Failed to assign role. Please try again.",
    };
  }
}

// =============================================================================
// Remove Contact Role
// =============================================================================

/**
 * Remove a role from a contact
 * Permission: MANAGE_CONTACTS (owner, admin, editor)
 *
 * AC-7.2.7: Implement removeContactRole action
 * - Delete from contact_roles
 */
export async function removeContactRole(
  contactId: string,
  role: ContactRoleType,
): Promise<ActionResult<ContactWithRoles>> {
  try {
    // Check permission
    await requirePermission(MANAGE_CONTACTS);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Verify contact exists and belongs to tenant
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)),
    });

    if (!contact) {
      return { success: false, error: "Contact not found" };
    }

    // Delete role
    await db
      .delete(contactRoles)
      .where(
        and(
          eq(contactRoles.contact_id, contactId),
          eq(contactRoles.role, role),
        ),
      );

    // Get updated contact with roles
    const contactWithRoles = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
      with: { roles: true },
    });

    // Revalidate cache
    revalidatePath("/contacts");

    return {
      success: true,
      data: contactWithRoles as ContactWithRoles,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to remove roles",
      };
    }

    console.error("removeContactRole error:", error);
    return {
      success: false,
      error: "Failed to remove role. Please try again.",
    };
  }
}

// =============================================================================
// Update Contact Role Data
// =============================================================================

/**
 * Update role-specific data for a contact
 * Permission: MANAGE_CONTACTS (owner, admin, editor)
 *
 * AC-7.2.7: Implement updateContactRoleData action
 * - Update role_specific_data JSONB
 */
export async function updateContactRoleData(
  contactId: string,
  role: ContactRoleType,
  roleSpecificData: Record<string, unknown>,
): Promise<ActionResult<ContactWithRoles>> {
  try {
    // Check permission
    await requirePermission(MANAGE_CONTACTS);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Verify contact exists and belongs to tenant
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)),
    });

    if (!contact) {
      return { success: false, error: "Contact not found" };
    }

    // Update role-specific data
    await db
      .update(contactRoles)
      .set({
        role_specific_data: roleSpecificData,
      })
      .where(
        and(
          eq(contactRoles.contact_id, contactId),
          eq(contactRoles.role, role),
        ),
      );

    // Get updated contact with roles
    const contactWithRoles = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
      with: { roles: true },
    });

    // Revalidate cache
    revalidatePath("/contacts");

    return {
      success: true,
      data: contactWithRoles as ContactWithRoles,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update role data",
      };
    }

    console.error("updateContactRoleData error:", error);
    return {
      success: false,
      error: "Failed to update role data. Please try again.",
    };
  }
}

// =============================================================================
// Fetch Contacts (for client components)
// =============================================================================

/**
 * Server Action wrapper for fetching contacts
 * Used by client components to fetch contacts
 */
export async function fetchContacts(options?: {
  includeInactive?: boolean;
  role?: ContactRoleType;
  searchQuery?: string;
}): Promise<ContactWithRoles[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const conditions = [eq(contacts.tenant_id, tenantId)];

  if (!options?.includeInactive) {
    conditions.push(eq(contacts.status, "active"));
  }

  const results = await db.query.contacts.findMany({
    where: and(...conditions),
    with: { roles: true },
    orderBy: (contacts, { asc }) => [asc(contacts.last_name), asc(contacts.first_name)],
  });

  // Filter by role if specified
  let filtered = results;
  if (options?.role) {
    filtered = results.filter((c) =>
      c.roles.some((r) => r.role === options.role),
    );
  }

  // Filter by search query if specified
  if (options?.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.first_name.toLowerCase().includes(query) ||
        c.last_name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query),
    );
  }

  return filtered as ContactWithRoles[];
}

/**
 * Get contact by ID with roles
 */
export async function getContactWithRoles(
  contactId: string,
): Promise<ContactWithRoles | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)),
    with: { roles: true },
  });

  return (contact as ContactWithRoles) || null;
}
