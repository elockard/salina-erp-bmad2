/**
 * ONIX Import Server Actions
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 8: Create import Server Actions (AC: 4, 7, 8)
 *
 * Server actions for importing titles from ONIX files.
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 */

"use server";

import Decimal from "decimal.js";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { contactRoles, contacts } from "@/db/schema/contacts";
import { onixImports } from "@/db/schema/onix-imports";
import { titleAuthors } from "@/db/schema/title-authors";
import { titles } from "@/db/schema/titles";
import { logAuditEvent } from "@/lib/audit";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import { CREATE_AUTHORS_TITLES } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { getParser } from "./base-parser";
import { detectAndConvertEncoding } from "./encoding-handler";
import {
  collectUnmappedFields,
  mapToSalinaTitle,
  toPreviewProduct,
} from "./field-mapper";
import type {
  ConflictResolution,
  ConflictResolutionEntry,
  ImportConflict,
  ImportPreview,
  ImportResult,
  MappedTitle,
  OwnershipOverride,
  PreviewProduct,
} from "./types";
import {
  checkDuplicateISBNs,
  collectErrors,
  validateFileConstraints,
  validateImportProduct,
  validateProductCount,
} from "./validation";
import { detectONIXVersion, estimateProductCount } from "./version-detector";

// =============================================================================
// Upload and Preview ONIX File
// =============================================================================

/**
 * Upload and parse ONIX file, returning preview data
 *
 * AC: 1 - System detects ONIX version (2.1, 3.0, 3.1)
 * AC: 2 - System parses Product records from all supported versions
 * AC: 3 - System maps ONIX fields to Salina title fields
 * AC: 4 - User can preview mapped data before import
 * AC: 5 - System shows row-level validation errors
 *
 * @param formData - FormData containing the ONIX XML file
 * @returns ImportPreview with parsed products and validation info
 */
export async function uploadONIXFile(
  formData: FormData,
): Promise<ActionResult<ImportPreview>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    const tenantId = await getCurrentTenantId();

    // Get file from form data
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file constraints
    const fileValidation = validateFileConstraints({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!fileValidation.valid) {
      return {
        success: false,
        error: fileValidation.error ?? "File validation failed",
      };
    }

    // Read and decode file
    const buffer = await file.arrayBuffer();
    const xml = detectAndConvertEncoding(buffer);

    // Quick check for product count before full parsing
    const estimatedCount = estimateProductCount(xml);
    const countValidation = validateProductCount(estimatedCount);
    if (!countValidation.valid) {
      return {
        success: false,
        error: countValidation.error ?? "Product count validation failed",
      };
    }

    // Detect ONIX version
    const version = detectONIXVersion(xml);
    if (version === "unknown") {
      return {
        success: false,
        error:
          "Unable to detect ONIX version. Ensure file is valid ONIX 2.1, 3.0, or 3.1.",
      };
    }

    // Parse with appropriate parser
    const parser = getParser(version);
    const parsed = parser.parse(xml);

    // Validate product count after actual parsing
    const actualCountValidation = validateProductCount(parsed.products.length);
    if (!actualCountValidation.valid) {
      return {
        success: false,
        error: actualCountValidation.error ?? "Product count validation failed",
      };
    }

    // Map products to Salina format
    const mappedTitles = parsed.products.map((p) =>
      mapToSalinaTitle(p, tenantId),
    );

    // Validate each product
    for (const mapped of mappedTitles) {
      const product = parsed.products[mapped.rawIndex];
      const productErrors = validateImportProduct(product);
      mapped.validationErrors.push(...productErrors);
    }

    // Check for duplicate ISBNs in import
    const duplicateErrors = checkDuplicateISBNs(mappedTitles);

    // Check for conflicts with existing titles
    const conflicts = await checkConflicts(tenantId, mappedTitles);

    // Convert to preview products
    const previewProducts: PreviewProduct[] = mappedTitles.map((mapped) => {
      const preview = toPreviewProduct(mapped);
      const product = parsed.products[mapped.rawIndex];
      preview.recordReference = product.recordReference;

      // Mark conflicts
      const conflict = conflicts.find((c) => c.isbn === mapped.title.isbn);
      if (conflict) {
        preview.hasConflict = true;
        preview.conflictTitleId = conflict.existingTitleId;
        preview.conflictTitleName = conflict.existingTitleName;
      }

      return preview;
    });

    // Collect all errors
    const allErrors = collectErrors(parsed.parsingErrors, mappedTitles);

    // Add duplicate errors
    for (const dupError of duplicateErrors) {
      allErrors.push(dupError);
    }

    return {
      success: true,
      data: {
        version,
        totalProducts: parsed.products.length,
        validProducts: mappedTitles.filter(
          (m) => m.validationErrors.length === 0,
        ).length,
        products: previewProducts,
        errors: allErrors,
        conflicts,
        unmappedFieldsSummary: collectUnmappedFields(mappedTitles),
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { success: false, error: "Permission denied" };
    }
    console.error("[ONIX Import] Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Import failed",
    };
  }
}

// =============================================================================
// Import ONIX Titles
// =============================================================================

/**
 * Import parsed ONIX titles into database
 *
 * AC: 6 - User can resolve conflicts (skip/update/create-new)
 * AC: 7 - Import creates titles with full metadata
 * AC: 8 - Import creates/links contacts for contributors
 *
 * @param previewData - ImportPreview from uploadONIXFile
 * @param selectedProducts - Indices of products to import
 * @param conflictResolutions - Map of ISBN to resolution (simple) or resolution entry with new ISBN
 * @param ownershipOverrides - Optional custom ownership percentages
 * @returns ImportResult with counts
 */
export async function importONIXTitles(
  previewData: ImportPreview,
  selectedProducts: number[],
  conflictResolutions: Record<
    string,
    ConflictResolution | ConflictResolutionEntry
  >,
  ownershipOverrides?: Record<number, OwnershipOverride[]>,
): Promise<ActionResult<ImportResult>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Validate selection
    if (!selectedProducts || selectedProducts.length === 0) {
      return { success: false, error: "No products selected for import" };
    }

    // Execute in transaction
    const result = await db.transaction(async (tx) => {
      let imported = 0;
      let skipped = 0;
      let updated = 0;
      let errorCount = 0;
      const createdTitleIds: string[] = [];
      const createdContactIds: string[] = [];

      for (const index of selectedProducts) {
        const product = previewData.products[index];

        // Skip products with validation errors
        if (product.validationErrors.length > 0) {
          errorCount++;
          continue;
        }

        // Check conflict resolution
        const resolutionEntry = product.isbn
          ? conflictResolutions[product.isbn]
          : undefined;

        // Normalize resolution entry (can be string or object)
        const resolution: ConflictResolution | undefined =
          typeof resolutionEntry === "string"
            ? resolutionEntry
            : resolutionEntry?.resolution;
        const newIsbnForCreateNew =
          typeof resolutionEntry === "object"
            ? resolutionEntry.newIsbn
            : undefined;

        if (product.hasConflict && resolution === "skip") {
          skipped++;
          continue;
        }

        try {
          if (product.hasConflict && resolution === "update") {
            // Update existing title
            await updateExistingTitle(
              tx,
              product,
              tenantId,
              ownershipOverrides?.[index],
            );
            updated++;
          } else if (product.hasConflict && resolution === "create-new") {
            // Create new title with new ISBN (required for create-new)
            if (!newIsbnForCreateNew) {
              console.error(
                `[ONIX Import] create-new requires a new ISBN for product ${index}`,
              );
              errorCount++;
              continue;
            }
            // Create with the new ISBN
            const titleId = await createNewTitle(
              tx,
              product,
              tenantId,
              user?.id,
              ownershipOverrides?.[index],
              createdContactIds,
              newIsbnForCreateNew, // Pass new ISBN
            );
            createdTitleIds.push(titleId);
            imported++;
          } else {
            // Create new title (no conflict or no resolution needed)
            const titleId = await createNewTitle(
              tx,
              product,
              tenantId,
              user?.id,
              ownershipOverrides?.[index],
              createdContactIds,
            );
            createdTitleIds.push(titleId);
            imported++;
          }
        } catch (err) {
          console.error(`[ONIX Import] Error importing product ${index}:`, err);
          errorCount++;
        }
      }

      return {
        imported,
        skipped,
        updated,
        errors: errorCount,
        createdTitleIds,
        createdContactIds,
      };
    });

    // Store import history
    const [importRecord] = await db
      .insert(onixImports)
      .values({
        tenant_id: tenantId,
        filename: "onix-import.xml", // TODO: Pass filename through
        onix_version: previewData.version,
        total_products: previewData.totalProducts,
        imported_count: result.imported,
        skipped_count: result.skipped,
        updated_count: result.updated,
        error_count: result.errors,
        status:
          result.errors > 0
            ? result.imported > 0
              ? "partial"
              : "failed"
            : "success",
        created_title_ids: result.createdTitleIds,
        created_contact_ids: result.createdContactIds,
        imported_by: user?.id,
      })
      .returning();

    // Log audit event
    logAuditEvent({
      tenantId,
      userId: user?.id || null,
      actionType: "CREATE",
      resourceType: "title",
      resourceId: importRecord.id,
      changes: {
        after: {
          action: "onix_import",
          version: previewData.version,
          imported: result.imported,
          skipped: result.skipped,
          updated: result.updated,
          errors: result.errors,
        },
      },
    });

    // Revalidate caches
    revalidatePath("/titles");
    revalidatePath("/contacts");

    return {
      success: true,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        updated: result.updated,
        errors: result.errors,
        importId: importRecord.id,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { success: false, error: "Permission denied" };
    }
    console.error("[ONIX Import] Import error:", error);
    return {
      success: false,
      error: "Import failed. No changes were saved.",
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check for existing titles with matching ISBNs
 */
async function checkConflicts(
  tenantId: string,
  mappedTitles: MappedTitle[],
): Promise<ImportConflict[]> {
  const db = await getDb();
  const conflicts: ImportConflict[] = [];

  // Get all ISBNs from import
  const isbns = mappedTitles
    .map((m) => m.title.isbn)
    .filter((isbn): isbn is string => isbn !== null);

  if (isbns.length === 0) return [];

  // Query existing titles
  const existingTitles = await db
    .select({ id: titles.id, isbn: titles.isbn, title: titles.title })
    .from(titles)
    .where(and(eq(titles.tenant_id, tenantId), inArray(titles.isbn, isbns)));

  // Build conflict map
  const existingMap = new Map(existingTitles.map((t) => [t.isbn, t]));

  for (const mapped of mappedTitles) {
    if (!mapped.title.isbn) continue;

    const existing = existingMap.get(mapped.title.isbn);
    if (existing) {
      conflicts.push({
        isbn: mapped.title.isbn,
        existingTitleId: existing.id,
        existingTitleName: existing.title,
        importProductIndex: mapped.rawIndex,
      });
    }
  }

  return conflicts;
}

/**
 * Create a new title from preview product
 *
 * @param isbnOverride - Optional new ISBN to use instead of product.isbn (for create-new conflict resolution)
 */
async function createNewTitle(
  tx: Parameters<
    Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]
  >[0],
  product: PreviewProduct,
  tenantId: string,
  userId: string | undefined,
  ownershipOverrides: OwnershipOverride[] | undefined,
  createdContactIds: string[],
  isbnOverride?: string,
): Promise<string> {
  // Use override ISBN if provided (for create-new conflict resolution)
  const isbnToUse = isbnOverride || product.isbn;

  // Create the title
  const [newTitle] = await tx
    .insert(titles)
    .values({
      tenant_id: tenantId,
      title: product.title,
      subtitle: product.subtitle,
      isbn: isbnToUse,
      publication_status:
        (product.publicationStatus as
          | "draft"
          | "pending"
          | "published"
          | "out_of_print") || "draft",
      publication_date: product.publicationDate || null,
    })
    .returning();

  // Create/link contributors
  if (product.contributors.length > 0) {
    await linkContributors(
      tx,
      newTitle.id,
      product.contributors,
      tenantId,
      userId,
      ownershipOverrides,
      createdContactIds,
    );
  }

  return newTitle.id;
}

/**
 * Update an existing title from preview product
 */
async function updateExistingTitle(
  tx: Parameters<
    Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]
  >[0],
  product: PreviewProduct,
  tenantId: string,
  _ownershipOverrides: OwnershipOverride[] | undefined,
): Promise<void> {
  if (!product.conflictTitleId) return;

  // Update title fields
  await tx
    .update(titles)
    .set({
      title: product.title,
      subtitle: product.subtitle,
      publication_status:
        (product.publicationStatus as
          | "draft"
          | "pending"
          | "published"
          | "out_of_print") || "draft",
      publication_date: product.publicationDate || null,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(titles.id, product.conflictTitleId),
        eq(titles.tenant_id, tenantId),
      ),
    );

  // Note: We don't update contributors on conflict resolution
  // to avoid overwriting manually configured author relationships
}

/**
 * Link contributors to title, creating contacts if needed
 */
async function linkContributors(
  tx: Parameters<
    Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]
  >[0],
  titleId: string,
  contributors: { name: string; role: string }[],
  tenantId: string,
  userId: string | undefined,
  ownershipOverrides: OwnershipOverride[] | undefined,
  createdContactIds: string[],
): Promise<void> {
  const contactIds: string[] = [];

  // Find or create contacts for each contributor
  for (const contributor of contributors) {
    const contactId = await findOrCreateContact(
      tx,
      contributor,
      tenantId,
      userId,
      createdContactIds,
    );
    contactIds.push(contactId);
  }

  // Calculate ownership percentages
  let ownershipData: {
    contactId: string;
    percentage: string;
    isPrimary: boolean;
  }[];

  if (ownershipOverrides && ownershipOverrides.length > 0) {
    // Use provided overrides
    ownershipData = ownershipOverrides.map((o) => ({
      contactId: o.contact_id,
      percentage: o.ownership_percentage,
      isPrimary: o.is_primary,
    }));
  } else {
    // Calculate equal split
    ownershipData = await calculateEqualSplit(contactIds);
  }

  // Create title_authors records
  for (const { contactId, percentage, isPrimary } of ownershipData) {
    await tx.insert(titleAuthors).values({
      title_id: titleId,
      contact_id: contactId,
      ownership_percentage: percentage,
      is_primary: isPrimary,
      created_by: userId,
    });
  }
}

/**
 * Find existing contact or create new one
 */
async function findOrCreateContact(
  tx: Parameters<
    Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]
  >[0],
  contributor: { name: string; role: string },
  tenantId: string,
  userId: string | undefined,
  createdContactIds: string[],
): Promise<string> {
  // Parse name into first/last
  const { firstName, lastName } = await parseName(contributor.name);

  // Try to find existing contact by exact name match
  const [existing] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        eq(contacts.tenant_id, tenantId),
        eq(contacts.first_name, firstName),
        eq(contacts.last_name, lastName),
        eq(contacts.status, "active"),
      ),
    )
    .limit(1);

  if (existing) {
    // Ensure contact has author role
    await ensureAuthorRole(tx, existing.id);
    return existing.id;
  }

  // Create new contact
  const [newContact] = await tx
    .insert(contacts)
    .values({
      tenant_id: tenantId,
      first_name: firstName,
      last_name: lastName,
      status: "active",
      created_by: userId,
    })
    .returning({ id: contacts.id });

  // Add author role
  await tx.insert(contactRoles).values({
    contact_id: newContact.id,
    role: "author",
    assigned_by: userId,
  });

  createdContactIds.push(newContact.id);
  return newContact.id;
}

/**
 * Ensure contact has author role
 */
async function ensureAuthorRole(
  tx: Parameters<
    Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]
  >[0],
  contactId: string,
): Promise<void> {
  const [existingRole] = await tx
    .select({ id: contactRoles.id })
    .from(contactRoles)
    .where(
      and(
        eq(contactRoles.contact_id, contactId),
        eq(contactRoles.role, "author"),
      ),
    )
    .limit(1);

  if (!existingRole) {
    await tx.insert(contactRoles).values({
      contact_id: contactId,
      role: "author",
    });
  }
}

/**
 * Parse full name into first and last name
 * @internal Exported for testing
 */
export async function parseName(fullName: string): Promise<{
  firstName: string;
  lastName: string;
}> {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "Unknown" };
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length === 1) {
    return { firstName: "", lastName: parts[0] };
  }

  // Assume last part is last name, rest is first name
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(" ");

  return { firstName, lastName };
}

/**
 * Calculate equal ownership split for contributors
 * @internal Exported for testing
 */
export async function calculateEqualSplit(
  contactIds: string[],
): Promise<{ contactId: string; percentage: string; isPrimary: boolean }[]> {
  const count = contactIds.length;

  if (count === 0) return [];
  if (count === 1) {
    return [
      { contactId: contactIds[0], percentage: "100.00", isPrimary: true },
    ];
  }

  // Calculate base value with 2 decimal places
  const baseValue = new Decimal(100)
    .dividedBy(count)
    .toDecimalPlaces(2, Decimal.ROUND_DOWN);

  // Calculate remainder
  const total = baseValue.times(count);
  const remainder = new Decimal(100).minus(total);

  return contactIds.map((contactId, index) => {
    // Last contact gets the remainder
    const percentage =
      index === count - 1
        ? baseValue.plus(remainder).toFixed(2)
        : baseValue.toFixed(2);

    return {
      contactId,
      percentage,
      isPrimary: index === 0, // First is primary
    };
  });
}

// =============================================================================
// Query Import History
// =============================================================================

/**
 * Get import history for current tenant
 */
export async function getImportHistory(
  limit = 10,
): Promise<ActionResult<(typeof onixImports.$inferSelect)[]>> {
  try {
    await requirePermission(CREATE_AUTHORS_TITLES);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const imports = await db
      .select()
      .from(onixImports)
      .where(eq(onixImports.tenant_id, tenantId))
      .orderBy(desc(onixImports.created_at))
      .limit(limit);

    return { success: true, data: imports };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { success: false, error: "Permission denied" };
    }
    console.error("[ONIX Import] History error:", error);
    return { success: false, error: "Failed to load import history" };
  }
}
