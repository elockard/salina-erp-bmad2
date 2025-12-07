"use server";

/**
 * @deprecated This module is deprecated. Use `@/modules/contacts` instead.
 *
 * Author Actions (Contact-Based)
 *
 * Story 7.3: Migrate Authors to Contacts
 * Story 0.5: Consolidate Authors into Contacts
 *
 * Authors are now contacts with role='author' in the contact_roles table.
 * All new code should use the contacts module directly:
 *   - import { createContact, updateContact } from "@/modules/contacts/actions"
 *   - Filter by role='author' when querying contacts
 *
 * This module is maintained for backward compatibility only.
 * See actions-legacy.ts for original authors table implementation.
 */

import { clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contacts, contactRoles } from "@/db/schema/contacts";
import { users } from "@/db/schema/users";
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import { encryptTaxId } from "@/lib/encryption";
import { CREATE_AUTHORS_TITLES, MANAGE_USERS } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { createAuthorSchema, updateAuthorSchema } from "./schema";
import type { Author } from "./types";

/**
 * Convert a contact to Author type for response compatibility
 */
function contactToAuthor(contact: typeof contacts.$inferSelect): Author {
  // Convert payment_info JSONB to payment_method string
  const paymentInfo = contact.payment_info as { method?: string } | null;
  const paymentMethod = paymentInfo?.method || null;

  return {
    id: contact.id,
    tenant_id: contact.tenant_id,
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
    first_name: contact.first_name,
    last_name: contact.last_name,
    contact_id: contact.id,
  };
}

/**
 * Split a full name into first and last name
 * Uses last word as last name, everything before as first name
 */
function splitName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  const lastSpaceIndex = trimmed.lastIndexOf(" ");

  if (lastSpaceIndex === -1) {
    // Single word name - use as last name
    return { firstName: "", lastName: trimmed };
  }

  return {
    firstName: trimmed.substring(0, lastSpaceIndex).trim(),
    lastName: trimmed.substring(lastSpaceIndex + 1).trim(),
  };
}

/**
 * Create a new author (as a contact with author role)
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * AC: 17 - Server Action createAuthor checks permission CREATE_AUTHORS_TITLES before insert
 * AC: 30 - Tax ID encrypted before storage using AES-256-GCM
 */
export async function createAuthor(
  data: unknown,
): Promise<ActionResult<Author>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate input
    const validated = createAuthorSchema.parse(data);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Split name into first/last
    const { firstName, lastName } = splitName(validated.name);

    // Encrypt tax_id if provided
    const encryptedTaxId = validated.tax_id
      ? encryptTaxId(validated.tax_id)
      : null;

    // Convert payment_method to payment_info JSONB
    const paymentInfo = validated.payment_method
      ? { method: validated.payment_method }
      : null;

    // Insert contact
    const [contact] = await db
      .insert(contacts)
      .values({
        tenant_id: tenantId,
        first_name: firstName || lastName, // If only one name, use as first name
        last_name: lastName || firstName,
        email: validated.email || null,
        phone: validated.phone || null,
        address_line1: validated.address || null,
        tax_id: encryptedTaxId,
        payment_info: paymentInfo,
        status: "active",
      })
      .returning();

    // Insert author role
    await db.insert(contactRoles).values({
      contact_id: contact.id,
      role: "author",
      role_specific_data: {},
    });

    // Revalidate cache
    revalidatePath("/dashboard/authors");
    revalidatePath("/dashboard/contacts");

    return { success: true, data: contactToAuthor(contact) };
  } catch (error) {
    // AC: 20 - On permission denied, return error
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage authors",
      };
    }

    // Zod validation error
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    console.error("createAuthor error:", error);
    return {
      success: false,
      error: "Failed to create author. Please try again.",
    };
  }
}

/**
 * Update an existing author (contact)
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * AC: 18 - Server Action updateAuthor checks permission CREATE_AUTHORS_TITLES before update
 */
export async function updateAuthor(
  id: string,
  data: unknown,
): Promise<ActionResult<Author>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate input
    const validated = updateAuthorSchema.parse(data);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get existing contact with author role
    const existing = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)),
      with: { roles: true },
    });

    if (!existing) {
      return { success: false, error: "Author not found" };
    }

    // Verify contact has author role
    if (!existing.roles.some((r) => r.role === "author")) {
      return { success: false, error: "Contact is not an author" };
    }

    // Prepare update values
    const updateValues: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (validated.name !== undefined) {
      const { firstName, lastName } = splitName(validated.name);
      updateValues.first_name = firstName || lastName;
      updateValues.last_name = lastName || firstName;
    }
    if (validated.email !== undefined) {
      updateValues.email = validated.email || null;
    }
    if (validated.phone !== undefined) {
      updateValues.phone = validated.phone || null;
    }
    if (validated.address !== undefined) {
      updateValues.address_line1 = validated.address || null;
    }
    if (validated.payment_method !== undefined) {
      updateValues.payment_info = validated.payment_method
        ? { method: validated.payment_method }
        : null;
    }

    // Encrypt tax_id if provided
    if (validated.tax_id !== undefined) {
      updateValues.tax_id = validated.tax_id
        ? encryptTaxId(validated.tax_id)
        : null;
    }

    // Update contact
    const [updated] = await db
      .update(contacts)
      .set(updateValues)
      .where(and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)))
      .returning();

    // Revalidate cache
    revalidatePath("/dashboard/authors");
    revalidatePath("/dashboard/contacts");

    return { success: true, data: contactToAuthor(updated) };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage authors",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    console.error("updateAuthor error:", error);
    return {
      success: false,
      error: "Failed to update author. Please try again.",
    };
  }
}

/**
 * Deactivate an author (soft delete via status change)
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * AC: 19 - Server Action deactivateAuthor checks permission CREATE_AUTHORS_TITLES before update
 * AC: 12 - Deactivate button sets contact status='inactive'
 */
export async function deactivateAuthor(
  id: string,
): Promise<ActionResult<Author>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Update contact status
    const [updated] = await db
      .update(contacts)
      .set({
        status: "inactive",
        updated_at: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)))
      .returning();

    if (!updated) {
      return { success: false, error: "Author not found" };
    }

    // Revalidate cache
    revalidatePath("/dashboard/authors");
    revalidatePath("/dashboard/contacts");

    return { success: true, data: contactToAuthor(updated) };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage authors",
      };
    }

    console.error("deactivateAuthor error:", error);
    return {
      success: false,
      error: "Failed to deactivate author. Please try again.",
    };
  }
}

/**
 * Reactivate an author
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 */
export async function reactivateAuthor(
  id: string,
): Promise<ActionResult<Author>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Update contact status
    const [updated] = await db
      .update(contacts)
      .set({
        status: "active",
        updated_at: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)))
      .returning();

    if (!updated) {
      return { success: false, error: "Author not found" };
    }

    // Revalidate cache
    revalidatePath("/dashboard/authors");
    revalidatePath("/dashboard/contacts");

    return { success: true, data: contactToAuthor(updated) };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage authors",
      };
    }

    console.error("reactivateAuthor error:", error);
    return {
      success: false,
      error: "Failed to reactivate author. Please try again.",
    };
  }
}

/**
 * Server Action wrapper for getAuthors query
 * Used by client components to fetch authors
 */
export async function fetchAuthors(options?: {
  includeInactive?: boolean;
}): Promise<Author[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const conditions = [eq(contacts.tenant_id, tenantId)];

  if (!options?.includeInactive) {
    conditions.push(eq(contacts.status, "active"));
  }

  // Query contacts with author role
  const result = await db.query.contacts.findMany({
    where: and(...conditions),
    with: { roles: true },
    orderBy: (contacts, { asc }) => [asc(contacts.last_name), asc(contacts.first_name)],
  });

  // Filter to only contacts with author role
  const authorsOnly = result.filter((c) =>
    c.roles.some((r) => r.role === "author"),
  );

  return authorsOnly.map(contactToAuthor);
}

/**
 * Get masked tax ID for display (server-side decryption + masking)
 * Only decrypts and masks for authorized roles
 */
export async function getMaskedTaxIdAction(
  taxId: string | null,
): Promise<string> {
  if (!taxId) {
    return "";
  }

  try {
    // Import dynamically to keep encryption server-only
    const { decryptTaxId, maskTaxId } = await import("@/lib/encryption");
    const decrypted = decryptTaxId(taxId);
    return maskTaxId(decrypted);
  } catch {
    // If decryption fails, return generic mask
    return "***-**-****";
  }
}

/**
 * Grant portal access to an author (contact)
 * Permission: MANAGE_USERS (owner, admin only)
 *
 * Story 2.3 - Author Portal Access Provisioning
 * AC: 6 - Server Action checks permission MANAGE_USERS
 * AC: 7 - Creates users record with role="author", tenant_id, is_active=false
 * AC: 8 - Links contact record via portal_user_id foreign key
 * AC: 9 - Calls Clerk invitations.createInvitation with author_id in metadata
 * AC: 10 - Clerk sends invitation email to author
 * AC: 11 - On success: returns user record for UI to show success toast
 * AC: 12 - On error: returns error message for UI to show error toast
 */
export async function grantPortalAccess(
  authorId: string,
): Promise<ActionResult<{ userId: string; email: string }>> {
  try {
    // AC: 6 - Check permission MANAGE_USERS (owner, admin only)
    await requirePermission(MANAGE_USERS);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get contact and validate it has author role
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, authorId), eq(contacts.tenant_id, tenantId)),
      with: { roles: true },
    });

    if (!contact) {
      return { success: false, error: "Author not found" };
    }

    // Verify contact has author role
    if (!contact.roles.some((r) => r.role === "author")) {
      return { success: false, error: "Contact is not an author" };
    }

    // Validate author has email (required for portal invitation)
    if (!contact.email) {
      return {
        success: false,
        error: "Author must have an email address to receive portal access",
      };
    }

    // Check if author already has portal access
    if (contact.portal_user_id) {
      return {
        success: false,
        error: "Author already has portal access",
      };
    }

    // AC: 7 - Create user record with role="author", is_active=false (pending activation)
    const [newUser] = await db
      .insert(users)
      .values({
        tenant_id: tenantId,
        email: contact.email,
        role: "author",
        is_active: false, // Will be activated by webhook when invitation is accepted
        clerk_user_id: null, // Will be set by webhook when user completes signup
      })
      .returning();

    // AC: 8 - Link contact record via portal_user_id foreign key
    await db
      .update(contacts)
      .set({
        portal_user_id: newUser.id,
        updated_at: new Date(),
      })
      .where(eq(contacts.id, authorId));

    // AC: 9 - Send Clerk invitation with author metadata
    try {
      const clerk = await clerkClient();
      await clerk.invitations.createInvitation({
        emailAddress: contact.email,
        publicMetadata: {
          author_id: authorId, // Now refers to contact.id
          contact_id: authorId, // Explicit contact reference
          tenant_id: tenantId,
          role: "author",
        },
        // redirectUrl is optional - Clerk will use default signup URL
      });
    } catch (clerkError) {
      // Rollback: remove user record and contact link if Clerk invitation fails
      await db
        .update(contacts)
        .set({ portal_user_id: null, updated_at: new Date() })
        .where(eq(contacts.id, authorId));
      await db.delete(users).where(eq(users.id, newUser.id));

      console.error("Clerk invitation error:", clerkError);
      return {
        success: false,
        error: "Failed to send portal invitation. Please try again.",
      };
    }

    // Revalidate cache
    revalidatePath("/dashboard/authors");
    revalidatePath("/dashboard/contacts");

    // AC: 11 - Return success with user info for toast
    return {
      success: true,
      data: { userId: newUser.id, email: contact.email },
    };
  } catch (error) {
    // AC: 6 - Permission denied handling
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage portal access",
      };
    }

    console.error("grantPortalAccess error:", error);
    // AC: 12 - Return error message for toast
    return {
      success: false,
      error: "Failed to grant portal access. Please try again.",
    };
  }
}

/**
 * Revoke portal access from an author (contact)
 * Permission: MANAGE_USERS (owner, admin only)
 *
 * Story 2.3 - Author Portal Access Provisioning
 * AC: 17 - Server Action sets users.is_active=false for author's portal user
 * AC: 18 - Returns success for UI to show toast and update button state
 */
export async function revokePortalAccess(
  authorId: string,
): Promise<ActionResult<void>> {
  try {
    // Check permission MANAGE_USERS (owner, admin only)
    await requirePermission(MANAGE_USERS);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get contact with portal user link
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, authorId), eq(contacts.tenant_id, tenantId)),
    });

    if (!contact) {
      return { success: false, error: "Author not found" };
    }

    // Validate author has portal access to revoke
    if (!contact.portal_user_id) {
      return {
        success: false,
        error: "Author does not have portal access",
      };
    }

    // AC: 17 - Set users.is_active=false for author's portal user
    await db
      .update(users)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(eq(users.id, contact.portal_user_id));

    // Revalidate cache
    revalidatePath("/dashboard/authors");
    revalidatePath("/dashboard/contacts");

    // AC: 18 - Return success for UI to show toast
    return { success: true, data: undefined };
  } catch (error) {
    // Permission denied handling
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage portal access",
      };
    }

    console.error("revokePortalAccess error:", error);
    return {
      success: false,
      error: "Failed to revoke portal access. Please try again.",
    };
  }
}

/**
 * Get author by ID with portal user info
 * Used by author detail component to check portal access status
 */
export async function getAuthorWithPortalStatus(authorId: string): Promise<
  | (Author & {
      portalUser: {
        id: string;
        is_active: boolean;
        clerk_user_id: string | null;
      } | null;
    })
  | null
> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, authorId), eq(contacts.tenant_id, tenantId)),
    with: {
      portalUser: true,
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

  return {
    ...author,
    portalUser: contact.portalUser
      ? {
          id: contact.portalUser.id,
          is_active: contact.portalUser.is_active,
          clerk_user_id: contact.portalUser.clerk_user_id,
        }
      : null,
  };
}
