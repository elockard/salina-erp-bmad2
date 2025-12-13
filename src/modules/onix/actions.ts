"use server";

/**
 * ONIX Export Server Actions
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 * Task 4: Implement export Server Actions
 *
 * Server Actions for exporting titles to ONIX 3.1 XML format.
 * Includes permission checks and export history tracking.
 */

import { eq } from "drizzle-orm";
import { onixExports } from "@/db/schema/onix-exports";
import { tenants } from "@/db/schema/tenants";
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import { CREATE_AUTHORS_TITLES } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { getTitleWithAuthors } from "@/modules/title-authors/queries";
import { ONIXMessageBuilder } from "./builder/message-builder";
import type { ExportResultWithValidation, ValidationResult } from "./types";
import { validateONIXMessage } from "./validator";

/**
 * Export a single title to ONIX 3.1 XML with validation
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 5: Update export actions with validation
 *
 * AC: 5 - Only validated exports are sent to channels
 * AC: 6 - System tracks export errors
 *
 * @param titleId - UUID of the title to export
 * @returns ActionResult with XML content, filename, and validation result
 */
export async function exportSingleTitle(
  titleId: string,
): Promise<ActionResult<ExportResultWithValidation>> {
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

    // Build ONIX XML
    const builder = new ONIXMessageBuilder(tenantId, {
      id: tenant.id,
      name: tenant.name,
      email: null, // Tenant email not available
      subdomain: tenant.subdomain,
      default_currency: tenant.default_currency || "USD",
    });

    builder.addTitle(title);
    const xml = builder.toXML();

    // Validate the generated XML
    const validation = await validateONIXMessage(xml);

    // Generate filename
    const filename = `salina-onix-${tenant.subdomain}-${Date.now()}.xml`;

    // Store export record with validation status
    const exportStatus = validation.valid ? "success" : "validation_error";
    const errorMessage = validation.valid
      ? null
      : JSON.stringify(validation.errors);

    await db.insert(onixExports).values({
      tenant_id: tenantId,
      title_ids: [titleId],
      xml_content: xml,
      product_count: 1,
      status: exportStatus,
      error_message: errorMessage,
    });

    return {
      success: true,
      data: {
        xml,
        filename,
        productCount: 1,
        validation,
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
 * Export multiple titles to ONIX 3.1 XML with validation
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 5: Update export actions with validation
 *
 * AC: 5 - Only validated exports are sent to channels
 * AC: 6 - System tracks export errors
 *
 * @param titleIds - Array of title UUIDs to export
 * @returns ActionResult with XML content, filename, product count, and validation result
 */
export async function exportBatchTitles(
  titleIds: string[],
): Promise<ActionResult<ExportResultWithValidation>> {
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

    // Build ONIX XML
    const builder = new ONIXMessageBuilder(tenantId, {
      id: tenant.id,
      name: tenant.name,
      email: null, // Tenant email not available
      subdomain: tenant.subdomain,
      default_currency: tenant.default_currency || "USD",
    });

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

    // Generate filename
    const filename = `salina-onix-${tenant.subdomain}-${Date.now()}.xml`;

    // Store export record with validation status
    const exportStatus = validation.valid ? "success" : "validation_error";
    const errorMessage = validation.valid
      ? null
      : JSON.stringify(validation.errors);

    await db.insert(onixExports).values({
      tenant_id: tenantId,
      title_ids: exportedTitleIds,
      xml_content: xml,
      product_count: productCount,
      status: exportStatus,
      error_message: errorMessage,
    });

    return {
      success: true,
      data: {
        xml,
        filename,
        productCount,
        validation,
        skippedTitleIds: skippedTitles.length > 0 ? skippedTitles : undefined,
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
