"use server";

/**
 * Sales Server Actions
 *
 * Server-side actions for sales transaction management.
 * Implements APPEND-ONLY ledger pattern - no updates or deletes.
 *
 * Story 3.2: Build Sales Transaction Entry Form
 * Related ACs: 2 (title search), 10 (record sale), 12 (permissions)
 *
 * Permission: RECORD_SALES (owner, admin, editor, finance)
 */

import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sales } from "@/db/schema/sales";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { RECORD_SALES } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import {
  getSaleById,
  getSalesStats,
  getSalesWithFilters,
  getTitleForSale,
  searchTitlesForSales,
} from "./queries";
import type { SalesFilterInput } from "./schema";
import { createSaleSchema, salesFilterSchema } from "./schema";
import type {
  PaginatedSales,
  SaleRecordResult,
  SalesStats,
  SaleWithRelations,
  TitleForSalesSelect,
} from "./types";

/**
 * Search titles for sales autocomplete
 *
 * AC 2: Debounced search (300ms) using Server Action
 * Returns titles with at least one format available (ISBN or eISBN)
 *
 * @param searchTerm - Search query for title/author name
 * @returns Array of matching titles with ISBN availability
 */
export async function searchTitlesAction(
  searchTerm: string,
): Promise<ActionResult<TitleForSalesSelect[]>> {
  try {
    // Permission check - must be able to record sales
    await requirePermission(RECORD_SALES);

    const results = await searchTitlesForSales(searchTerm, 10);
    return { success: true, data: results };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to search titles",
      };
    }

    console.error("searchTitlesAction error:", error);
    return {
      success: false,
      error: "Failed to search titles",
    };
  }
}

/**
 * Record a new sale transaction
 *
 * AC 10: Server Action validates with Zod schema, inserts sale record
 * AC 12: Permission check for Editor/Finance/Admin/Owner
 *
 * APPEND-ONLY: This is the only mutation for sales table (FR29)
 *
 * @param data - Sale data from form
 * @returns ActionResult with sale details on success
 */
export async function recordSale(
  data: unknown,
): Promise<ActionResult<SaleRecordResult>> {
  try {
    // 1. Permission check
    await requirePermission(RECORD_SALES);

    // 2. Get current user for audit trail
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // 3. Validate input with Zod
    const validated = createSaleSchema.parse(data);

    // 4. Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // 5. Validate title exists and has the requested format
    const title = await getTitleForSale(validated.title_id);
    if (!title) {
      return {
        success: false,
        error: "Selected title no longer available",
      };
    }

    // Validate format is available for this title
    if (validated.format === "physical" && !title.has_isbn) {
      return {
        success: false,
        error:
          "Physical format not available for this title (no ISBN assigned)",
      };
    }
    if (validated.format === "ebook" && !title.has_eisbn) {
      return {
        success: false,
        error: "Ebook format not available for this title (no eISBN assigned)",
      };
    }
    // Audiobook format validation - for future when audiobook ISBNs are tracked
    if (validated.format === "audiobook") {
      return {
        success: false,
        error: "Audiobook format not yet supported",
      };
    }

    // 6. Compute total_amount server-side using Decimal.js
    // CRITICAL: Never use JavaScript arithmetic for currency
    const totalAmount = new Decimal(validated.unit_price)
      .times(validated.quantity)
      .toFixed(2);

    // 7. Insert sale record (APPEND-ONLY)
    const [sale] = await db
      .insert(sales)
      .values({
        tenant_id: tenantId,
        title_id: validated.title_id,
        format: validated.format,
        quantity: validated.quantity,
        unit_price: validated.unit_price,
        total_amount: totalAmount,
        sale_date: validated.sale_date,
        channel: validated.channel,
        created_by_user_id: user.id,
      })
      .returning();

    // 8. Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "sale",
      resourceId: sale.id,
      changes: {
        after: {
          id: sale.id,
          title_id: sale.title_id,
          title_name: title.title,
          format: sale.format,
          quantity: sale.quantity,
          unit_price: sale.unit_price,
          total_amount: sale.total_amount,
          sale_date: validated.sale_date,
          channel: sale.channel,
        },
      },
    });

    // 9. Revalidate sales-related paths
    revalidatePath("/sales");
    revalidatePath("/dashboard");

    // 10. Return success with sale details for toast message
    return {
      success: true,
      data: {
        id: sale.id,
        title_name: title.title,
        quantity: sale.quantity,
        total_amount: sale.total_amount,
      },
    };
  } catch (error) {
    // Permission denied
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to record sales",
      };
    }

    // Zod validation error
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        const field = issue.path[0]?.toString() || "unknown";
        fieldErrors[field] = issue.message;
      });

      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
        fields: fieldErrors,
      };
    }

    console.error("recordSale error:", error);
    return {
      success: false,
      error: "Failed to record sale. Please try again.",
    };
  }
}

/**
 * Get paginated sales history with filters
 *
 * Story 3.3: AC 3 (table), AC 4 (filters), AC 5 (pagination), AC 9 (permissions)
 *
 * @param filters - Filter criteria (date range, title, format, channel)
 * @param page - Page number (1-indexed, default 1)
 * @param pageSize - Items per page (default 20)
 * @returns Paginated sales with related title and user data
 */
export async function getSalesHistoryAction(
  filters: SalesFilterInput = {},
  page: number = 1,
  pageSize: number = 20,
): Promise<ActionResult<PaginatedSales>> {
  try {
    // Permission check - same roles as recordSale
    await requirePermission(RECORD_SALES);

    // Validate filters if provided
    const validatedFilters = salesFilterSchema.parse(filters);

    // Get paginated results
    const results = await getSalesWithFilters(validatedFilters, page, pageSize);

    return { success: true, data: results };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view sales history",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid filter parameters",
      };
    }

    console.error("getSalesHistoryAction error:", error);
    return {
      success: false,
      error: "Failed to fetch sales history",
    };
  }
}

/**
 * Get sales statistics for dashboard cards
 *
 * Story 3.3: AC 2 (stats cards), AC 9 (permissions)
 * Stats refresh on filter changes
 *
 * @param filters - Optional filter criteria (respects same filters as table)
 * @returns Stats: total sales $, transaction count, best selling title
 */
export async function getSalesStatsAction(
  filters: SalesFilterInput = {},
): Promise<ActionResult<SalesStats>> {
  try {
    // Permission check
    await requirePermission(RECORD_SALES);

    // Validate filters if provided
    const validatedFilters = salesFilterSchema.parse(filters);

    // Get stats
    const stats = await getSalesStats(validatedFilters);

    return { success: true, data: stats };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view sales statistics",
      };
    }

    console.error("getSalesStatsAction error:", error);
    return {
      success: false,
      error: "Failed to fetch sales statistics",
    };
  }
}

/**
 * Get a single sale by ID for detail modal
 *
 * Story 3.3: AC 6 (transaction detail modal)
 *
 * @param saleId - Sale UUID
 * @returns Sale with related data
 */
export async function getSaleByIdAction(
  saleId: string,
): Promise<ActionResult<SaleWithRelations>> {
  try {
    // Permission check
    await requirePermission(RECORD_SALES);

    if (!saleId || typeof saleId !== "string") {
      return { success: false, error: "Invalid sale ID" };
    }

    const sale = await getSaleById(saleId);

    if (!sale) {
      return { success: false, error: "Sale not found" };
    }

    return { success: true, data: sale };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view sale details",
      };
    }

    console.error("getSaleByIdAction error:", error);
    return {
      success: false,
      error: "Failed to fetch sale details",
    };
  }
}

/**
 * Export sales to CSV
 *
 * Story 3.3: AC 7 (CSV export)
 * Exports currently filtered results
 *
 * @param filters - Filter criteria (respects same filters as table)
 * @returns CSV content as string
 */
export async function exportSalesCsvAction(
  filters: SalesFilterInput = {},
): Promise<ActionResult<string>> {
  try {
    // Permission check
    await requirePermission(RECORD_SALES);

    // Validate filters
    const validatedFilters = salesFilterSchema.parse(filters);

    // Get all filtered results (no pagination for export)
    const results = await getSalesWithFilters(validatedFilters, 1, 10000);

    // Build CSV content
    const headers = [
      "Date",
      "Title",
      "Author",
      "Format",
      "Quantity",
      "Unit Price",
      "Total Amount",
      "Channel",
      "Recorded By",
      "Recorded At",
    ];

    const formatCurrency = (amount: string) => {
      const num = parseFloat(amount);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(num);
    };

    const formatChannelLabel = (channel: string) => {
      const labels: Record<string, string> = {
        retail: "Retail",
        wholesale: "Wholesale",
        direct: "Direct",
        distributor: "Distributor",
      };
      return labels[channel] || channel;
    };

    const formatFormatLabel = (format: string) => {
      const labels: Record<string, string> = {
        physical: "Physical",
        ebook: "Ebook",
        audiobook: "Audiobook",
      };
      return labels[format] || format;
    };

    const escapeCSV = (value: string | number): string => {
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = results.items.map((sale) => [
      escapeCSV(sale.sale_date),
      escapeCSV(sale.title.title),
      escapeCSV(sale.title.author_name),
      escapeCSV(formatFormatLabel(sale.format)),
      escapeCSV(sale.quantity),
      escapeCSV(formatCurrency(sale.unit_price)),
      escapeCSV(formatCurrency(sale.total_amount)),
      escapeCSV(formatChannelLabel(sale.channel)),
      escapeCSV(sale.createdBy.name),
      escapeCSV(sale.created_at.toISOString()),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n",
    );

    return { success: true, data: csv };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to export sales data",
      };
    }

    console.error("exportSalesCsvAction error:", error);
    return {
      success: false,
      error: "Failed to export sales data",
    };
  }
}
