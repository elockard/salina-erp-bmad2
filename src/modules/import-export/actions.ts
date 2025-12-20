"use server";

/**
 * Import/Export Module Server Actions
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 4: Server actions for import
 *
 * Story: 19.3 - Export Catalog to CSV
 * Task 5: Server actions for export
 *
 * FRs: FR170, FR171, FR173
 *
 * Patterns from:
 * - src/modules/isbn/actions.ts (bulk insert, transaction)
 * - src/modules/invoices/actions.ts (adminDb.transaction)
 * - src/modules/contacts/queries.ts (ilike author lookup)
 */

import { format } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";

import { contactRoles, contacts } from "@/db/schema/contacts";
import { csvExports } from "@/db/schema/csv-exports";
import { csvImports } from "@/db/schema/csv-imports";
import { titles } from "@/db/schema/titles";
import { inngest } from "@/inngest/client";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import { CREATE_AUTHORS_TITLES, VIEW_CONTACTS } from "@/lib/permissions";
import { createImportCompleteNotification } from "@/modules/notifications/service";
import {
  generateContactsCsv,
  generateSalesCsv,
  generateTitlesCsv,
  getContactsExportCount,
  getSalesExportCount,
  getTitlesExportCount,
} from "./exporters/csv-exporter";
import { matchTitlesByIsbn } from "./matchers/isbn-matcher";
import type {
  BulkUpdateResult,
  ColumnMapping,
  ExportDataType,
  ExportFilters,
  ExportResult,
  ImportResult,
  ImportRowError,
  MatchResult,
  TitleMatch,
  ValidatedTitleRow,
} from "./types";

import { EXPORT_SYNC_THRESHOLD } from "./types";

// =============================================================================
// VALIDATE CSV IMPORT ACTION
// =============================================================================

interface ValidateCsvImportInput {
  rows: ValidatedTitleRow[];
}

interface ValidateCsvImportResult {
  valid: boolean;
  errors: ImportRowError[];
  unmatchedAuthors: string[];
  duplicateIsbnsInDb: string[];
  duplicateAsinsInDb: string[];
}

/**
 * Server-side validation of CSV import data
 *
 * Validates:
 * - Author names match existing contacts
 * - ISBNs are globally unique
 * - ASINs are globally unique
 */
export async function validateCsvImportAction(
  input: ValidateCsvImportInput,
): Promise<ValidateCsvImportResult> {
  await requirePermission(CREATE_AUTHORS_TITLES);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const errors: ImportRowError[] = [];
  const unmatchedAuthors: string[] = [];
  const duplicateIsbnsInDb: string[] = [];
  const duplicateAsinsInDb: string[] = [];

  // Collect unique author names, ISBNs, ASINs
  const authorNames = new Set<string>();
  const isbns = new Set<string>();
  const asins = new Set<string>();

  for (const row of input.rows) {
    if (row.authorName) {
      authorNames.add(row.authorName.toLowerCase().trim());
    }
    if (row.data.isbn) {
      isbns.add(row.data.isbn);
    }
    if (row.data.asin) {
      asins.add(row.data.asin);
    }
  }

  // Check author names against contacts with author role
  if (authorNames.size > 0) {
    const contactMatches = new Map<string, string>(); // name -> contact_id

    // Look up contacts that have author role
    const authorContacts = await db
      .select({
        id: contacts.id,
        first_name: contacts.first_name,
        last_name: contacts.last_name,
      })
      .from(contacts)
      .innerJoin(contactRoles, eq(contacts.id, contactRoles.contact_id))
      .where(
        and(
          eq(contacts.tenant_id, tenantId),
          eq(contactRoles.role, "author"),
          eq(contacts.status, "active"),
        ),
      );

    // Build lookup map
    for (const contact of authorContacts) {
      const fullName =
        `${contact.first_name} ${contact.last_name}`.toLowerCase();
      contactMatches.set(fullName, contact.id);
      // Also add just last name for partial matching
      contactMatches.set(contact.last_name.toLowerCase(), contact.id);
    }

    // Check each author name
    for (const name of authorNames) {
      // Try exact match first
      if (!contactMatches.has(name)) {
        // Try partial match (check if any contact name contains this name)
        let found = false;
        for (const [contactName] of contactMatches) {
          if (contactName.includes(name) || name.includes(contactName)) {
            found = true;
            break;
          }
        }
        if (!found) {
          unmatchedAuthors.push(name);
        }
      }
    }
  }

  // Check ISBN uniqueness (global - across all tenants)
  if (isbns.size > 0) {
    const existingIsbns = await db
      .select({ isbn: titles.isbn })
      .from(titles)
      .where(inArray(titles.isbn, Array.from(isbns)));

    for (const { isbn } of existingIsbns) {
      if (isbn) {
        duplicateIsbnsInDb.push(isbn);
      }
    }
  }

  // Check ASIN uniqueness (global - across all tenants)
  if (asins.size > 0) {
    const existingAsins = await db
      .select({ asin: titles.asin })
      .from(titles)
      .where(inArray(titles.asin, Array.from(asins)));

    for (const { asin } of existingAsins) {
      if (asin) {
        duplicateAsinsInDb.push(asin);
      }
    }
  }

  // Add errors for unmatched authors
  for (const row of input.rows) {
    if (
      row.authorName &&
      unmatchedAuthors.includes(row.authorName.toLowerCase().trim())
    ) {
      errors.push({
        row: row.row,
        field: "author_name",
        value: row.authorName,
        message: `Author not found: ${row.authorName}`,
      });
    }
  }

  // Add errors for duplicate ISBNs
  for (const row of input.rows) {
    if (row.data.isbn && duplicateIsbnsInDb.includes(row.data.isbn)) {
      errors.push({
        row: row.row,
        field: "isbn",
        value: row.data.isbn,
        message: `ISBN already exists in database: ${row.data.isbn}`,
      });
    }
  }

  // Add errors for duplicate ASINs
  for (const row of input.rows) {
    if (row.data.asin && duplicateAsinsInDb.includes(row.data.asin)) {
      errors.push({
        row: row.row,
        field: "asin",
        value: row.data.asin,
        message: `ASIN already exists in database: ${row.data.asin}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    unmatchedAuthors,
    duplicateIsbnsInDb,
    duplicateAsinsInDb,
  };
}

// =============================================================================
// IMPORT TITLES FROM CSV ACTION
// =============================================================================

interface ImportTitlesInput {
  filename: string;
  columnMappings: ColumnMapping[];
  rows: ValidatedTitleRow[];
}

/**
 * Import titles from validated CSV data
 *
 * Uses transaction for all-or-nothing import.
 * Creates import tracking record for audit trail.
 */
export async function importTitlesFromCsvAction(
  input: ImportTitlesInput,
): Promise<ImportResult> {
  await requirePermission(CREATE_AUTHORS_TITLES);
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const userId = user?.id;
  const db = await getDb();

  const errors: ImportRowError[] = [];
  const createdTitleIds: string[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    // Resolve author names to contact IDs
    const authorContactMap = await resolveAuthors(db, tenantId, input.rows);

    // Filter to valid rows only
    const validRows = input.rows.filter((row) => row.valid);

    if (validRows.length === 0) {
      return {
        success: false,
        totalRows: input.rows.length,
        imported: 0,
        skipped: input.rows.length,
        errors: [
          {
            row: 0,
            field: "",
            value: "",
            message: "No valid rows to import",
          },
        ],
        createdTitleIds: [],
        importId: "",
      };
    }

    // Build title records
    const now = new Date();
    const titleRecords = validRows.map((row) => {
      // Get contact_id from author name lookup
      let contactId: string | undefined;
      if (row.authorName) {
        contactId = authorContactMap.get(row.authorName.toLowerCase().trim());
      }

      return {
        tenant_id: tenantId,
        title: row.data.title,
        subtitle: row.data.subtitle || null,
        contact_id: contactId || null,
        isbn: row.data.isbn || null,
        genre: row.data.genre || null,
        publication_date: row.data.publication_date || null,
        publication_status: row.data.publication_status || "draft",
        word_count: row.data.word_count || null,
        asin: row.data.asin || null,
        bisac_code: row.data.bisac_code || null,
        bisac_codes: row.data.bisac_codes || null,
        created_at: now,
        updated_at: now,
      };
    });

    // Use transaction for all-or-nothing import
    const result = await db.transaction(async (tx) => {
      // Create import tracking record
      const [importRecord] = await tx
        .insert(csvImports)
        .values({
          tenant_id: tenantId,
          filename: input.filename,
          import_type: "titles",
          total_rows: input.rows.length,
          imported_count: 0, // Will update after insert
          skipped_count: input.rows.length - validRows.length,
          error_count: input.rows.length - validRows.length,
          status: "success", // Will update if error
          imported_by: userId,
          column_mappings: input.columnMappings,
        })
        .returning();

      // Bulk insert titles
      const insertedTitles = await tx
        .insert(titles)
        .values(titleRecords)
        .returning({ id: titles.id });

      const titleIds = insertedTitles.map((t) => t.id);

      // Update import record with results
      await tx
        .update(csvImports)
        .set({
          imported_count: titleIds.length,
          created_title_ids: titleIds,
          status: "success",
          completed_at: new Date(),
          result_details: {
            imported: titleIds.length,
            skipped: input.rows.length - validRows.length,
            updated: 0,
            errors: input.rows.length - validRows.length,
            conflicts: 0,
          },
        })
        .where(eq(csvImports.id, importRecord.id));

      return {
        importId: importRecord.id,
        titleIds,
      };
    });

    imported = result.titleIds.length;
    skipped = input.rows.length - validRows.length;
    createdTitleIds.push(...result.titleIds);

    // Create import complete notification (Story 20.2)
    try {
      await createImportCompleteNotification({
        tenantId,
        importId: result.importId,
        recordCount: imported,
        filename: input.filename,
      });
    } catch {
      // Don't fail import if notification fails
      console.warn("Failed to create import notification");
    }

    return {
      success: true,
      totalRows: input.rows.length,
      imported,
      skipped,
      errors,
      createdTitleIds,
      importId: result.importId,
    };
  } catch (error) {
    console.error("Import error:", error);

    // Try to record the failed import
    try {
      await db.insert(csvImports).values({
        tenant_id: tenantId,
        filename: input.filename,
        import_type: "titles",
        total_rows: input.rows.length,
        imported_count: 0,
        error_count: input.rows.length,
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        imported_by: userId,
        column_mappings: input.columnMappings,
      });
    } catch {
      // Ignore tracking error
    }

    return {
      success: false,
      totalRows: input.rows.length,
      imported: 0,
      skipped: 0,
      errors: [
        {
          row: 0,
          field: "",
          value: "",
          message: error instanceof Error ? error.message : "Import failed",
        },
      ],
      createdTitleIds: [],
      importId: "",
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Resolve author names to contact IDs
 */
async function resolveAuthors(
  db: Awaited<ReturnType<typeof getDb>>,
  tenantId: string,
  rows: ValidatedTitleRow[],
): Promise<Map<string, string>> {
  const authorNames = new Set<string>();
  for (const row of rows) {
    if (row.authorName) {
      authorNames.add(row.authorName.toLowerCase().trim());
    }
  }

  if (authorNames.size === 0) {
    return new Map();
  }

  // Look up contacts with author role
  const authorContacts = await db
    .select({
      id: contacts.id,
      first_name: contacts.first_name,
      last_name: contacts.last_name,
    })
    .from(contacts)
    .innerJoin(contactRoles, eq(contacts.id, contactRoles.contact_id))
    .where(
      and(
        eq(contacts.tenant_id, tenantId),
        eq(contactRoles.role, "author"),
        eq(contacts.status, "active"),
      ),
    );

  // Build lookup map with various name formats
  const contactMap = new Map<string, string>();
  for (const contact of authorContacts) {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const lastFirst =
      `${contact.last_name}, ${contact.first_name}`.toLowerCase();
    const lastOnly = contact.last_name.toLowerCase();

    contactMap.set(fullName, contact.id);
    contactMap.set(lastFirst, contact.id);
    // Only set first/last if not already set (prefer more specific matches)
    if (!contactMap.has(lastOnly)) {
      contactMap.set(lastOnly, contact.id);
    }
  }

  return contactMap;
}

// =============================================================================
// CSV EXPORT ACTIONS (Story 19.3)
// =============================================================================

/**
 * Get export preview count
 *
 * Returns the number of rows that would be exported based on filters.
 * Used to show preview before starting export.
 *
 * AC 6.6: Show export preview count before starting
 */
export async function getExportPreviewCountAction(
  exportType: ExportDataType,
  filters?: ExportFilters,
): Promise<{ count: number }> {
  await requirePermission(VIEW_CONTACTS);
  const tenantId = await getCurrentTenantId();

  let count = 0;

  switch (exportType) {
    case "titles":
      count = await getTitlesExportCount(tenantId, filters);
      break;
    case "contacts":
      count = await getContactsExportCount(tenantId, filters);
      break;
    case "sales":
      count = await getSalesExportCount(tenantId, filters);
      break;
  }

  return { count };
}

/**
 * Request CSV export
 *
 * AC 1: Select data type (titles, contacts, sales)
 * AC 2: Filter by date range
 * AC 3: Export generates CSV file
 * AC 4: Large exports processed in background
 *
 * Returns:
 * - For sync exports (≤1000 rows): Returns CSV content directly
 * - For async exports (>1000 rows): Returns export ID for status polling
 */
export async function requestExportAction(
  exportType: ExportDataType,
  filters?: ExportFilters,
): Promise<
  | { mode: "sync"; csv: string; filename: string; rowCount: number }
  | { mode: "async"; exportId: string; estimatedRows: number }
> {
  await requirePermission(VIEW_CONTACTS);
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const userId = user?.id;
  const db = await getDb();

  // Get row count to determine sync vs async
  let count = 0;
  switch (exportType) {
    case "titles":
      count = await getTitlesExportCount(tenantId, filters);
      break;
    case "contacts":
      count = await getContactsExportCount(tenantId, filters);
      break;
    case "sales":
      count = await getSalesExportCount(tenantId, filters);
      break;
  }

  // Generate filename with timestamp
  const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
  const filename = `${exportType}-export-${timestamp}.csv`;

  // Sync export for small datasets
  if (count <= EXPORT_SYNC_THRESHOLD) {
    let csv = "";

    switch (exportType) {
      case "titles":
        csv = await generateTitlesCsv(tenantId, filters);
        break;
      case "contacts":
        csv = await generateContactsCsv(tenantId, filters);
        break;
      case "sales":
        csv = await generateSalesCsv(tenantId, filters);
        break;
    }

    // Create tracking record for audit
    await db.insert(csvExports).values({
      tenant_id: tenantId,
      export_type: exportType,
      filename,
      filters: filters || null,
      row_count: count,
      file_size: Buffer.byteLength(csv, "utf8"),
      status: "completed",
      requested_by: userId,
      started_at: new Date(),
      completed_at: new Date(),
    });

    return {
      mode: "sync",
      csv,
      filename,
      rowCount: count,
    };
  }

  // Async export for large datasets
  const [exportRecord] = await db
    .insert(csvExports)
    .values({
      tenant_id: tenantId,
      export_type: exportType,
      filename,
      filters: filters || null,
      status: "pending",
      requested_by: userId,
    })
    .returning();

  // Trigger Inngest job
  await inngest.send({
    name: "csv-export/generate",
    data: {
      exportId: exportRecord.id,
      tenantId,
      exportType,
      filters,
    },
  });

  return {
    mode: "async",
    exportId: exportRecord.id,
    estimatedRows: count,
  };
}

/**
 * Get export status
 *
 * AC 5: I'm notified when export is ready
 *
 * Polls the export record for status updates.
 * Returns current status, progress, and download URL when complete.
 */
export async function getExportStatusAction(
  exportId: string,
): Promise<ExportResult | null> {
  await requirePermission(VIEW_CONTACTS);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const exportRecord = await db.query.csvExports.findFirst({
    where: and(eq(csvExports.id, exportId), eq(csvExports.tenant_id, tenantId)),
  });

  if (!exportRecord) {
    return null;
  }

  return {
    id: exportRecord.id,
    status: exportRecord.status as ExportResult["status"],
    exportType: exportRecord.export_type as ExportDataType,
    rowCount: exportRecord.row_count || 0,
    fileSize: exportRecord.file_size || undefined,
    fileUrl: exportRecord.file_url || undefined,
    filters: exportRecord.filters as ExportFilters | undefined,
    errorMessage: exportRecord.error_message || undefined,
    createdAt: exportRecord.created_at,
    startedAt: exportRecord.started_at || undefined,
    completedAt: exportRecord.completed_at || undefined,
    expiresAt: exportRecord.expires_at || undefined,
  };
}

/**
 * Get export download URL
 *
 * For async exports, returns the presigned S3 URL for download.
 * Returns null if export is not completed or URL has expired.
 */
export async function getExportDownloadUrlAction(
  exportId: string,
): Promise<{ url: string; filename: string } | null> {
  await requirePermission(VIEW_CONTACTS);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const exportRecord = await db.query.csvExports.findFirst({
    where: and(eq(csvExports.id, exportId), eq(csvExports.tenant_id, tenantId)),
  });

  if (!exportRecord) {
    return null;
  }

  if (exportRecord.status !== "completed" || !exportRecord.file_url) {
    return null;
  }

  // Check if URL has expired
  if (exportRecord.expires_at && exportRecord.expires_at < new Date()) {
    return null;
  }

  return {
    url: exportRecord.file_url,
    filename: exportRecord.filename,
  };
}

// =============================================================================
// BULK UPDATE ACTIONS (Story 19.4)
// =============================================================================

/**
 * Match CSV rows to existing titles by ISBN
 *
 * Story: 19.4 - Bulk Update via CSV
 * Task 5.1: Server action for ISBN matching
 *
 * AC 1: System matches records by ISBN
 * AC 2: Can preview changes before applying
 *
 * @param rows - Validated CSV rows with mapped data
 * @returns MatchResult with matched titles, unmatched ISBNs, and rows without ISBN
 */
export async function matchTitlesByIsbnAction(
  rows: ValidatedTitleRow[],
): Promise<MatchResult> {
  await requirePermission(CREATE_AUTHORS_TITLES);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  return matchTitlesByIsbn(db, tenantId, rows);
}

/**
 * Bulk update titles from CSV data
 *
 * Story: 19.4 - Bulk Update via CSV
 * Task 5.1: Server action for bulk updates
 *
 * AC 3: Only changed fields are updated
 * AC 4: Update history is logged
 *
 * Uses transaction for atomic updates.
 * Only updates fields that have changed (selective update).
 * Logs all changes for audit trail.
 *
 * PERFORMANCE NOTE: Updates are processed individually within a transaction
 * to support per-row field-level updates and error tracking. For very large
 * CSV files (500+ rows), consider chunked processing in a future enhancement.
 * Current design prioritizes correctness and audit granularity over raw speed.
 *
 * @param input - Update configuration with matched titles and mappings
 * @returns BulkUpdateResult with counts and any errors
 */
export async function bulkUpdateTitlesFromCsvAction(input: {
  filename: string;
  columnMappings: ColumnMapping[];
  updates: TitleMatch[];
  createUnmatched: boolean;
  unmatchedRows?: ValidatedTitleRow[];
}): Promise<BulkUpdateResult> {
  await requirePermission(CREATE_AUTHORS_TITLES);
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const userId = user?.id;
  const db = await getDb();

  const errors: ImportRowError[] = [];
  const updatedTitleIds: string[] = [];
  const createdTitleIds: string[] = [];
  let updatedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  try {
    // Filter to only selected updates with changes
    const selectedUpdates = input.updates.filter(
      (u) => u.hasChanges && u.selected,
    );

    if (selectedUpdates.length === 0 && !input.createUnmatched) {
      return {
        success: true,
        updatedCount: 0,
        createdCount: 0,
        skippedCount: input.updates.length,
        errors: [],
        importId: "",
        updatedTitleIds: [],
        createdTitleIds: [],
      };
    }

    // Build update details for audit log
    const updateDetails: Array<{
      titleId: string;
      isbn: string;
      changes: Array<{
        field: string;
        oldValue: unknown;
        newValue: unknown;
      }>;
    }> = [];

    // Determine import mode
    const importMode = input.createUnmatched
      ? "upsert"
      : input.updates.some((u) => u.hasChanges)
        ? "update"
        : "create";

    // Use transaction for atomic updates
    const result = await db.transaction(async (tx) => {
      // Create import tracking record
      const [importRecord] = await tx
        .insert(csvImports)
        .values({
          tenant_id: tenantId,
          filename: input.filename,
          import_type: "titles",
          import_mode: importMode,
          total_rows: input.updates.length + (input.unmatchedRows?.length || 0),
          imported_count: 0, // Will update after
          skipped_count: 0,
          error_count: 0,
          status: "success", // Will update to partial/failed if errors
          imported_by: userId,
          column_mappings: input.columnMappings,
        })
        .returning();

      // Process each update
      for (const update of selectedUpdates) {
        try {
          // Build dynamic update object with only changed fields
          const updateData: Record<string, unknown> = {
            updated_at: new Date(),
          };

          for (const change of update.diff.changedFields) {
            // Map field key to database column
            const dbColumn = change.fieldKey;
            updateData[dbColumn] = change.newValue;
          }

          // Update the title
          await tx
            .update(titles)
            .set(updateData)
            .where(
              and(
                eq(titles.id, update.titleId),
                eq(titles.tenant_id, tenantId),
              ),
            );

          updatedTitleIds.push(update.titleId);
          updatedCount++;

          // Track for audit
          updateDetails.push({
            titleId: update.titleId,
            isbn: update.isbn,
            changes: update.diff.changedFields.map((c) => ({
              field: c.field,
              oldValue: c.oldValue,
              newValue: c.newValue,
            })),
          });
        } catch (error) {
          errors.push({
            row: update.rowNumber,
            field: "update",
            value: update.isbn,
            message:
              error instanceof Error
                ? error.message
                : `Failed to update ${update.isbn}`,
          });
        }
      }

      // Handle upsert mode - create new titles for unmatched ISBNs
      if (input.createUnmatched && input.unmatchedRows?.length) {
        const now = new Date();
        for (const row of input.unmatchedRows) {
          try {
            const [newTitle] = await tx
              .insert(titles)
              .values({
                tenant_id: tenantId,
                title: row.data.title,
                subtitle: row.data.subtitle || null,
                isbn: row.data.isbn || null,
                genre: row.data.genre || null,
                publication_date: row.data.publication_date || null,
                publication_status: row.data.publication_status || "draft",
                word_count: row.data.word_count || null,
                asin: row.data.asin || null,
                bisac_code: row.data.bisac_code || null,
                bisac_codes: row.data.bisac_codes || null,
                created_at: now,
                updated_at: now,
              })
              .returning({ id: titles.id });

            createdTitleIds.push(newTitle.id);
            createdCount++;
          } catch (error) {
            errors.push({
              row: row.row,
              field: "create",
              value: row.data.isbn || "",
              message:
                error instanceof Error
                  ? error.message
                  : `Failed to create title for ${row.data.isbn}`,
            });
          }
        }
      }

      // Calculate skipped (rows that didn't match or had no changes)
      skippedCount = input.updates.filter(
        (u) => !u.hasChanges || !u.selected,
      ).length;

      // Update import record with results
      await tx
        .update(csvImports)
        .set({
          imported_count: updatedCount,
          updated_count: updatedCount,
          skipped_count: skippedCount,
          error_count: errors.length,
          created_title_ids:
            createdTitleIds.length > 0 ? createdTitleIds : null,
          updated_title_ids:
            updatedTitleIds.length > 0 ? updatedTitleIds : null,
          update_details: updateDetails.length > 0 ? updateDetails : null,
          status: errors.length > 0 ? "partial" : "success",
          completed_at: new Date(),
          result_details: {
            imported: createdCount,
            updated: updatedCount,
            skipped: skippedCount,
            errors: errors.length,
            conflicts: 0,
          },
        })
        .where(eq(csvImports.id, importRecord.id));

      return {
        importId: importRecord.id,
      };
    });

    return {
      success: errors.length === 0,
      updatedCount,
      createdCount,
      skippedCount,
      errors,
      importId: result.importId,
      updatedTitleIds,
      createdTitleIds,
    };
  } catch (error) {
    console.error("Bulk update error:", error);

    // Try to record the failed update
    try {
      await db.insert(csvImports).values({
        tenant_id: tenantId,
        filename: input.filename,
        import_type: "titles",
        total_rows: input.updates.length,
        imported_count: 0,
        error_count: 1,
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        imported_by: userId,
        column_mappings: input.columnMappings,
      });
    } catch {
      // Ignore tracking error
    }

    return {
      success: false,
      updatedCount: 0,
      createdCount: 0,
      skippedCount: 0,
      errors: [
        {
          row: 0,
          field: "",
          value: "",
          message:
            error instanceof Error ? error.message : "Bulk update failed",
        },
      ],
      importId: "",
      updatedTitleIds: [],
      createdTitleIds: [],
    };
  }
}
