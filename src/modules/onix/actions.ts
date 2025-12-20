"use server";

/**
 * ONIX Export Server Actions
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 * Story: 14.6 - Add ONIX 3.0 Export Fallback
 * Task 4: Implement export Server Actions
 *
 * Server Actions for exporting titles to ONIX 3.0 and 3.1 XML format.
 * Includes permission checks and export history tracking.
 */

import { eq } from "drizzle-orm";
import { onixExports } from "@/db/schema/onix-exports";
import { tenants } from "@/db/schema/tenants";
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import { CREATE_AUTHORS_TITLES } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { webhookEvents } from "@/modules/api/webhooks/dispatcher";
import { getTitleWithAuthors } from "@/modules/title-authors/queries";
import { ONIXMessageBuilder } from "./builder/message-builder";
import type { ONIXVersion } from "./parser/types";
import type { ExportResultWithValidation, ValidationResult } from "./types";
import { validateONIXMessage } from "./validator";

/**
 * Export options for ONIX export
 * Story 14.6: Added onixVersion for 3.0/3.1 selection
 */
interface ExportOptions {
  /** ONIX version to export (default: "3.1") */
  onixVersion?: ONIXVersion;
}

/**
 * Export a single title to ONIX XML with validation
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Story: 14.6 - Add ONIX 3.0 Export Fallback
 * Task 5: Update export actions with validation
 *
 * AC: 5 - Only validated exports are sent to channels
 * AC: 6 - System tracks export errors
 *
 * @param titleId - UUID of the title to export
 * @param options - Export options including ONIX version
 * @returns ActionResult with XML content, filename, and validation result
 */
export async function exportSingleTitle(
  titleId: string,
  options?: ExportOptions,
): Promise<ActionResult<ExportResultWithValidation>> {
  const version = options?.onixVersion ?? "3.1";
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get tenant info for builder
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }

    // Get title with authors
    const title = await getTitleWithAuthors(titleId);

    if (!title) {
      return { success: false, error: "Title not found" };
    }

    // Validate ISBN is present
    if (!title.isbn) {
      return {
        success: false,
        error: "Cannot export title without ISBN. Please assign an ISBN first.",
      };
    }

    // Build ONIX XML (Story 14.6: Pass version to builder)
    const builder = new ONIXMessageBuilder(
      tenantId,
      {
        id: tenant.id,
        name: tenant.name,
        email: null, // Tenant email not available
        subdomain: tenant.subdomain,
        default_currency: tenant.default_currency || "USD",
      },
      version,
    );

    builder.addTitle(title);
    const xml = builder.toXML();

    // Validate the generated XML
    const validation = await validateONIXMessage(xml);

    // Generate filename (Story 14.6: Include version in filename)
    const versionSuffix = version.replace(".", "");
    const filename = `salina-onix-${versionSuffix}-${tenant.subdomain}-${Date.now()}.xml`;

    // Store export record with validation status
    const exportStatus = validation.valid ? "success" : "validation_error";
    const errorMessage = validation.valid
      ? null
      : JSON.stringify(validation.errors);

    // Story 14.6: Store version in export record
    const [exportRecord] = await db
      .insert(onixExports)
      .values({
        tenant_id: tenantId,
        title_ids: [titleId],
        xml_content: xml,
        product_count: 1,
        onix_version: version,
        status: exportStatus,
        error_message: errorMessage,
      })
      .returning();

    // Fire-and-forget webhook dispatch (Story 15.5)
    webhookEvents
      .onixExported(tenantId, {
        id: exportRecord.id,
        format: `ONIX ${version}`,
        titleCount: 1,
        fileName: filename,
      })
      .catch(() => {}); // Ignore errors

    return {
      success: true,
      data: {
        xml,
        filename,
        productCount: 1,
        validation,
        onixVersion: version as "3.0" | "3.1",
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { success: false, error: "Permission denied" };
    }
    console.error("[ONIX Export] Error:", error);
    return { success: false, error: "Export failed" };
  }
}

/**
 * Export multiple titles to ONIX XML with validation
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Story: 14.6 - Add ONIX 3.0 Export Fallback
 * Task 5: Update export actions with validation
 *
 * AC: 5 - Only validated exports are sent to channels
 * AC: 6 - System tracks export errors
 *
 * @param titleIds - Array of title UUIDs to export
 * @param options - Export options including ONIX version
 * @returns ActionResult with XML content, filename, product count, and validation result
 */
export async function exportBatchTitles(
  titleIds: string[],
  options?: ExportOptions,
): Promise<ActionResult<ExportResultWithValidation>> {
  const version = options?.onixVersion ?? "3.1";
  try {
    // Validate input
    if (!titleIds || titleIds.length === 0) {
      return { success: false, error: "No titles provided for export" };
    }

    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get tenant info for builder
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }

    // Build ONIX XML (Story 14.6: Pass version to builder)
    const builder = new ONIXMessageBuilder(
      tenantId,
      {
        id: tenant.id,
        name: tenant.name,
        email: null, // Tenant email not available
        subdomain: tenant.subdomain,
        default_currency: tenant.default_currency || "USD",
      },
      version,
    );

    // Track exported title IDs and skipped titles
    const exportedTitleIds: string[] = [];
    const skippedTitles: string[] = [];

    // Add each title to builder
    for (const titleId of titleIds) {
      const title = await getTitleWithAuthors(titleId);

      if (!title) {
        skippedTitles.push(titleId);
        continue;
      }

      if (!title.isbn) {
        skippedTitles.push(titleId);
        continue;
      }

      builder.addTitle(title);
      exportedTitleIds.push(titleId);
    }

    // Check if any titles were exported
    if (exportedTitleIds.length === 0) {
      return {
        success: false,
        error: "No valid titles to export. Ensure titles have ISBNs assigned.",
      };
    }

    const xml = builder.toXML();
    const productCount = exportedTitleIds.length;

    // Validate the generated XML
    const validation = await validateONIXMessage(xml);

    // Generate filename (Story 14.6: Include version in filename)
    const versionSuffix = version.replace(".", "");
    const filename = `salina-onix-${versionSuffix}-${tenant.subdomain}-${Date.now()}.xml`;

    // Store export record with validation status
    const exportStatus = validation.valid ? "success" : "validation_error";
    const errorMessage = validation.valid
      ? null
      : JSON.stringify(validation.errors);

    // Story 14.6: Store version in export record
    const [exportRecord] = await db
      .insert(onixExports)
      .values({
        tenant_id: tenantId,
        title_ids: exportedTitleIds,
        xml_content: xml,
        product_count: productCount,
        onix_version: version,
        status: exportStatus,
        error_message: errorMessage,
      })
      .returning();

    // Fire-and-forget webhook dispatch (Story 15.5)
    webhookEvents
      .onixExported(tenantId, {
        id: exportRecord.id,
        format: `ONIX ${version}`,
        titleCount: productCount,
        fileName: filename,
      })
      .catch(() => {}); // Ignore errors

    return {
      success: true,
      data: {
        xml,
        filename,
        productCount,
        validation,
        skippedTitleIds: skippedTitles.length > 0 ? skippedTitles : undefined,
        onixVersion: version as "3.0" | "3.1",
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { success: false, error: "Permission denied" };
    }
    console.error("[ONIX Export] Error:", error);
    return { success: false, error: "Export failed" };
  }
}

/**
 * Validate ONIX XML content
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 4: Create validation action
 *
 * AC: 4 - User can fix errors and re-validate without re-generating
 * AC: 5 - Only validated exports are sent to channels
 *
 * @param xml - The ONIX XML string to validate
 * @returns ActionResult with ValidationResult
 */
export async function validateONIXExport(
  xml: string,
): Promise<ActionResult<ValidationResult>> {
  try {
    // Check permission (same as export)
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate the XML
    const result = await validateONIXMessage(xml);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { success: false, error: "Permission denied" };
    }
    console.error("[ONIX Validation] Error:", error);
    return { success: false, error: "Validation failed" };
  }
}
