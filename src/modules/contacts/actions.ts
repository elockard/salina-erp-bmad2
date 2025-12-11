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
import { contactRoles, contacts } from "@/db/schema/contacts";
import { logAuditEvent } from "@/lib/audit";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import { encryptTIN } from "@/lib/encryption";
import {
  ASSIGN_CUSTOMER_ROLE,
  MANAGE_CONTACTS,
  MANAGE_USERS,
  VIEW_TAX_ID,
} from "@/lib/permissions";
import { extractLastFour } from "@/lib/tin-validation";
import type { ActionResult } from "@/lib/types";
import {
  type AssignContactRoleInput,
  assignContactRoleSchema,
  type CreateContactInput,
  createContactSchema,
  type TaxInfoInput,
  taxInfoSchema,
  type UpdateContactInput,
  type UpdateTaxInfoInput,
  updateContactSchema,
  updateTaxInfoSchema,
} from "./schema";
import type { ContactRoleType, ContactWithRoles } from "./types";

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
    orderBy: (contacts, { asc }) => [
      asc(contacts.last_name),
      asc(contacts.first_name),
    ],
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

// =============================================================================
// Tax Information Management (Story 11.1)
// =============================================================================

/**
 * Update tax information for a contact
 * Permission: VIEW_TAX_ID (owner, admin, finance)
 *
 * Story 11.1 - AC-11.1.1, AC-11.1.4: Tax section restricted to Finance/Admin roles
 * - Encrypts TIN using AES-256-GCM before storage
 * - Stores last 4 digits separately for masked display
 * - Creates audit log for tax info changes
 *
 * @param contactId - The contact ID to update
 * @param taxInfo - Tax information to update (TIN will be encrypted)
 */
export async function updateContactTaxInfo(
  contactId: string,
  taxInfo: TaxInfoInput,
): Promise<ActionResult<ContactWithRoles>> {
  try {
    // Check permission - AC-11.1.1: Only Finance/Admin can modify tax info
    await requirePermission(VIEW_TAX_ID);

    // Validate input
    const validated = taxInfoSchema.parse(taxInfo);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Verify contact exists and belongs to tenant
    const existing = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)),
      with: { roles: true },
    });

    if (!existing) {
      return { success: false, error: "Contact not found" };
    }

    // Encrypt TIN
    const encryptedTIN = encryptTIN(validated.tin);
    const lastFour = extractLastFour(validated.tin);

    // Update contact with encrypted tax info
    await db
      .update(contacts)
      .set({
        tin_encrypted: encryptedTIN,
        tin_type: validated.tin_type,
        tin_last_four: lastFour,
        is_us_based: validated.is_us_based,
        w9_received: validated.w9_received,
        w9_received_date: validated.w9_received_date,
        updated_at: new Date(),
      })
      .where(and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)));

    // Get updated contact with roles
    const contactWithRoles = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
      with: { roles: true },
    });

    // Fire and forget audit log with sensitive data masked
    logAuditEvent({
      tenantId,
      userId: user?.id || null,
      actionType: "UPDATE",
      resourceType: "contact",
      resourceId: contactId,
      changes: {
        after: {
          tin_type: validated.tin_type,
          tin_last_four: lastFour,
          is_us_based: validated.is_us_based,
          w9_received: validated.w9_received,
          w9_received_date: validated.w9_received_date,
          // NOTE: Full TIN is NOT logged for security
        },
      },
      metadata: { action: "tax_info_updated" },
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
        error: "You don't have permission to update tax information",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid tax information",
      };
    }

    if (
      error instanceof Error &&
      error.message.includes("TIN_ENCRYPTION_KEY")
    ) {
      console.error("TIN encryption key not configured:", error);
      return {
        success: false,
        error:
          "Tax information encryption is not configured. Contact administrator.",
      };
    }

    console.error("updateContactTaxInfo error:", error);
    return {
      success: false,
      error: "Failed to update tax information. Please try again.",
    };
  }
}

/**
 * Partial update of tax information for a contact
 * Permission: VIEW_TAX_ID (owner, admin, finance)
 *
 * Story 11.1 - AC-11.1.1, AC-11.1.4: Tax section restricted to Finance/Admin roles
 * Allows updating individual tax fields without requiring all fields.
 *
 * @param contactId - The contact ID to update
 * @param taxInfo - Partial tax information to update
 */
export async function updateContactTaxInfoPartial(
  contactId: string,
  taxInfo: UpdateTaxInfoInput,
): Promise<ActionResult<ContactWithRoles>> {
  try {
    // Check permission - AC-11.1.1: Only Finance/Admin can modify tax info
    await requirePermission(VIEW_TAX_ID);

    // Validate input
    const validated = updateTaxInfoSchema.parse(taxInfo);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Verify contact exists and belongs to tenant
    const existing = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)),
      with: { roles: true },
    });

    if (!existing) {
      return { success: false, error: "Contact not found" };
    }

    // Build update object
    const updateValues: Record<string, unknown> = {
      updated_at: new Date(),
    };

    // Handle TIN update (requires encryption)
    if (validated.tin && validated.tin_type) {
      updateValues.tin_encrypted = encryptTIN(validated.tin);
      updateValues.tin_type = validated.tin_type;
      updateValues.tin_last_four = extractLastFour(validated.tin);
    }

    // Handle other fields
    if (validated.is_us_based !== undefined) {
      updateValues.is_us_based = validated.is_us_based;
    }
    if (validated.w9_received !== undefined) {
      updateValues.w9_received = validated.w9_received;
    }
    if (validated.w9_received_date !== undefined) {
      updateValues.w9_received_date = validated.w9_received_date;
    }

    // Update contact
    await db
      .update(contacts)
      .set(updateValues)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)));

    // Get updated contact with roles
    const contactWithRoles = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
      with: { roles: true },
    });

    // Fire and forget audit log
    logAuditEvent({
      tenantId,
      userId: user?.id || null,
      actionType: "UPDATE",
      resourceType: "contact",
      resourceId: contactId,
      changes: {
        after: {
          fields_updated: Object.keys(updateValues).filter(
            (k) => k !== "updated_at",
          ),
          // NOTE: TIN value is NOT logged for security
        },
      },
      metadata: { action: "tax_info_partial_update" },
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
        error: "You don't have permission to update tax information",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid tax information",
      };
    }

    if (
      error instanceof Error &&
      error.message.includes("TIN_ENCRYPTION_KEY")
    ) {
      console.error("TIN encryption key not configured:", error);
      return {
        success: false,
        error:
          "Tax information encryption is not configured. Contact administrator.",
      };
    }

    console.error("updateContactTaxInfoPartial error:", error);
    return {
      success: false,
      error: "Failed to update tax information. Please try again.",
    };
  }
}

/**
 * Clear tax information from a contact
 * Permission: VIEW_TAX_ID (owner, admin, finance)
 *
 * Story 11.1 - AC-11.1.1: Tax section restricted to Finance/Admin roles
 * Removes all TIN data for a contact.
 * Used when an author is no longer subject to 1099 reporting (e.g., non-US)
 *
 * @param contactId - The contact ID to clear tax info from
 */
export async function clearContactTaxInfo(
  contactId: string,
): Promise<ActionResult<ContactWithRoles>> {
  try {
    // Check permission - AC-11.1.1: Only Finance/Admin can modify tax info
    await requirePermission(VIEW_TAX_ID);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Verify contact exists and belongs to tenant
    const existing = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)),
      with: { roles: true },
    });

    if (!existing) {
      return { success: false, error: "Contact not found" };
    }

    // Clear tax information
    await db
      .update(contacts)
      .set({
        tin_encrypted: null,
        tin_type: null,
        tin_last_four: null,
        w9_received: false,
        w9_received_date: null,
        updated_at: new Date(),
      })
      .where(and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)));

    // Get updated contact with roles
    const contactWithRoles = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
      with: { roles: true },
    });

    // Fire and forget audit log
    logAuditEvent({
      tenantId,
      userId: user?.id || null,
      actionType: "UPDATE",
      resourceType: "contact",
      resourceId: contactId,
      changes: {
        after: {
          tin_encrypted: null,
          tin_type: null,
          tin_last_four: null,
        },
      },
      metadata: { action: "tax_info_cleared" },
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
        error: "You don't have permission to clear tax information",
      };
    }

    console.error("clearContactTaxInfo error:", error);
    return {
      success: false,
      error: "Failed to clear tax information. Please try again.",
    };
  }
}
