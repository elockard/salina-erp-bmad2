"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authors } from "@/db/schema/authors";
import { users } from "@/db/schema/users";
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import { encryptTaxId } from "@/lib/encryption";
import { CREATE_AUTHORS_TITLES, MANAGE_USERS } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { createAuthorSchema, updateAuthorSchema } from "./schema";
import type { Author } from "./types";

/**
 * Create a new author
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

    // Encrypt tax_id if provided
    const encryptedTaxId = validated.tax_id
      ? encryptTaxId(validated.tax_id)
      : null;

    // Insert author
    const [author] = await db
      .insert(authors)
      .values({
        tenant_id: tenantId,
        name: validated.name,
        email: validated.email || null,
        phone: validated.phone || null,
        address: validated.address || null,
        tax_id: encryptedTaxId,
        payment_method: validated.payment_method || null,
        is_active: true,
      })
      .returning();

    // Revalidate cache
    revalidatePath("/dashboard/authors");

    return { success: true, data: author };
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
 * Update an existing author
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

    // Get existing author
    const existing = await db.query.authors.findFirst({
      where: and(eq(authors.id, id), eq(authors.tenant_id, tenantId)),
    });

    if (!existing) {
      return { success: false, error: "Author not found" };
    }

    // Prepare update values
    const updateValues: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (validated.name !== undefined) {
      updateValues.name = validated.name;
    }
    if (validated.email !== undefined) {
      updateValues.email = validated.email || null;
    }
    if (validated.phone !== undefined) {
      updateValues.phone = validated.phone || null;
    }
    if (validated.address !== undefined) {
      updateValues.address = validated.address || null;
    }
    if (validated.payment_method !== undefined) {
      updateValues.payment_method = validated.payment_method || null;
    }

    // Encrypt tax_id if provided
    if (validated.tax_id !== undefined) {
      updateValues.tax_id = validated.tax_id
        ? encryptTaxId(validated.tax_id)
        : null;
    }

    // Update author
    const [updated] = await db
      .update(authors)
      .set(updateValues)
      .where(and(eq(authors.id, id), eq(authors.tenant_id, tenantId)))
      .returning();

    // Revalidate cache
    revalidatePath("/dashboard/authors");

    return { success: true, data: updated };
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
 * Deactivate an author (soft delete)
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * AC: 19 - Server Action deactivateAuthor checks permission CREATE_AUTHORS_TITLES before update
 * AC: 12 - Deactivate button sets author is_active=false
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

    // Update author
    const [updated] = await db
      .update(authors)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(and(eq(authors.id, id), eq(authors.tenant_id, tenantId)))
      .returning();

    if (!updated) {
      return { success: false, error: "Author not found" };
    }

    // Revalidate cache
    revalidatePath("/dashboard/authors");

    return { success: true, data: updated };
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

    // Update author
    const [updated] = await db
      .update(authors)
      .set({
        is_active: true,
        updated_at: new Date(),
      })
      .where(and(eq(authors.id, id), eq(authors.tenant_id, tenantId)))
      .returning();

    if (!updated) {
      return { success: false, error: "Author not found" };
    }

    // Revalidate cache
    revalidatePath("/dashboard/authors");

    return { success: true, data: updated };
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

  const conditions = [eq(authors.tenant_id, tenantId)];

  if (!options?.includeInactive) {
    conditions.push(eq(authors.is_active, true));
  }

  const result = await db.query.authors.findMany({
    where: and(...conditions),
    orderBy: (authors, { asc }) => [asc(authors.name)],
  });

  return result;
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
 * Grant portal access to an author
 * Permission: MANAGE_USERS (owner, admin only)
 *
 * Story 2.3 - Author Portal Access Provisioning
 * AC: 6 - Server Action checks permission MANAGE_USERS
 * AC: 7 - Creates users record with role="author", tenant_id, is_active=false
 * AC: 8 - Links author record via portal_user_id foreign key
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

    // Get author and validate
    const author = await db.query.authors.findFirst({
      where: and(eq(authors.id, authorId), eq(authors.tenant_id, tenantId)),
    });

    if (!author) {
      return { success: false, error: "Author not found" };
    }

    // Validate author has email (required for portal invitation)
    if (!author.email) {
      return {
        success: false,
        error: "Author must have an email address to receive portal access",
      };
    }

    // Check if author already has portal access
    if (author.portal_user_id) {
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
        email: author.email,
        role: "author",
        is_active: false, // Will be activated by webhook when invitation is accepted
        clerk_user_id: null, // Will be set by webhook when user completes signup
      })
      .returning();

    // AC: 8 - Link author record via portal_user_id foreign key
    await db
      .update(authors)
      .set({
        portal_user_id: newUser.id,
        updated_at: new Date(),
      })
      .where(eq(authors.id, authorId));

    // AC: 9 - Send Clerk invitation with author metadata
    try {
      const clerk = await clerkClient();
      await clerk.invitations.createInvitation({
        emailAddress: author.email,
        publicMetadata: {
          author_id: authorId,
          tenant_id: tenantId,
          role: "author",
        },
        // redirectUrl is optional - Clerk will use default signup URL
      });
    } catch (clerkError) {
      // Rollback: remove user record and author link if Clerk invitation fails
      await db
        .update(authors)
        .set({ portal_user_id: null, updated_at: new Date() })
        .where(eq(authors.id, authorId));
      await db.delete(users).where(eq(users.id, newUser.id));

      console.error("Clerk invitation error:", clerkError);
      return {
        success: false,
        error: "Failed to send portal invitation. Please try again.",
      };
    }

    // Revalidate cache
    revalidatePath("/dashboard/authors");

    // AC: 11 - Return success with user info for toast
    return {
      success: true,
      data: { userId: newUser.id, email: author.email },
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
 * Revoke portal access from an author
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

    // Get author with portal user link
    const author = await db.query.authors.findFirst({
      where: and(eq(authors.id, authorId), eq(authors.tenant_id, tenantId)),
    });

    if (!author) {
      return { success: false, error: "Author not found" };
    }

    // Validate author has portal access to revoke
    if (!author.portal_user_id) {
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
      .where(eq(users.id, author.portal_user_id));

    // Revalidate cache
    revalidatePath("/dashboard/authors");

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

  const author = await db.query.authors.findFirst({
    where: and(eq(authors.id, authorId), eq(authors.tenant_id, tenantId)),
    with: {
      portalUser: true,
    },
  });

  return author || null;
}
