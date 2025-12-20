/**
 * CSV Export Generators
 *
 * Story: 19.3 - Export Catalog to CSV
 * Task 2: Create CSV export generators
 *
 * FR173: Publisher can export catalog data to CSV for external analysis
 *
 * Generates CSV exports with:
 * - UTF-8 BOM for Excel compatibility
 * - Timestamp header row
 * - Proper field escaping
 * - Tenant-isolated data queries
 *
 * Note: These functions take tenant ID as a parameter for use in Inngest jobs
 * which run outside HTTP request context.
 */

import { format } from "date-fns";
import { and, desc, eq, gte, lte } from "drizzle-orm";

import { adminDb } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { sales } from "@/db/schema/sales";
import { titleAuthors } from "@/db/schema/title-authors";
import { titles } from "@/db/schema/titles";

import {
  CONTACT_EXPORT_FIELD_METADATA,
  type ExportFilters,
  SALES_EXPORT_FIELD_METADATA,
  TITLE_EXPORT_FIELD_METADATA,
} from "../types";

// =============================================================================
// CSV UTILITIES
// =============================================================================

/**
 * UTF-8 BOM for Excel compatibility
 * Per ar-export-buttons.tsx and csv-template-generator.ts patterns
 */
const UTF8_BOM = "\ufeff";

/**
 * Escape a field value for CSV
 * - Wraps in quotes if contains comma, quote, or newline
 * - Escapes internal quotes by doubling them
 */
function escapeField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // Check if escaping is needed
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    // Escape quotes by doubling them, then wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Format a date for CSV export
 */
function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy-MM-dd");
}

/**
 * Format a timestamp for CSV export
 */
function formatTimestamp(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy-MM-dd HH:mm:ss");
}

/**
 * Generate the timestamp header row
 */
function generateHeaderRow(exportType: string): string {
  const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const typeLabel = exportType.charAt(0).toUpperCase() + exportType.slice(1);
  return `"Salina ERP Export - ${typeLabel} - Generated: ${timestamp}"`;
}

// =============================================================================
// TITLES CSV EXPORT
// =============================================================================

/**
 * Generate CSV export for titles
 *
 * AC 3: Export generates CSV file
 * Uses getTitles() query pattern with tenant isolation
 *
 * @param tenantId - Tenant UUID for isolation
 * @param filters - Optional filters (dateRange, publicationStatus)
 * @returns CSV string with UTF-8 BOM
 */
export async function generateTitlesCsv(
  tenantId: string,
  filters?: ExportFilters,
): Promise<string> {
  // Build query conditions
  const conditions = [eq(titles.tenant_id, tenantId)];

  // Date range filter on created_at
  if (filters?.dateRange?.from) {
    conditions.push(gte(titles.created_at, filters.dateRange.from));
  }
  if (filters?.dateRange?.to) {
    conditions.push(lte(titles.created_at, filters.dateRange.to));
  }

  // Publication status filter
  if (filters?.publicationStatus) {
    conditions.push(eq(titles.publication_status, filters.publicationStatus));
  }

  // Query titles with author info
  // Following getTitles() pattern from titles/queries.ts
  const result = await adminDb.query.titles.findMany({
    where: and(...conditions),
    with: {
      contact: true,
      titleAuthors: {
        with: {
          contact: true,
        },
        orderBy: [
          desc(titleAuthors.is_primary),
          desc(titleAuthors.ownership_percentage),
        ],
      },
    },
    orderBy: desc(titles.updated_at),
  });

  // Generate CSV headers from metadata
  const headers = TITLE_EXPORT_FIELD_METADATA.map((m) => m.columnHeader).join(
    ",",
  );

  // Generate data rows
  const rows = result.map((title) => {
    // Compute author name from titleAuthors or legacy contact
    const primaryAuthor =
      title.titleAuthors?.find((ta) => ta.is_primary) ||
      title.titleAuthors?.[0];
    const authorName = primaryAuthor?.contact
      ? `${primaryAuthor.contact.first_name || ""} ${primaryAuthor.contact.last_name || ""}`.trim()
      : title.contact
        ? `${title.contact.first_name || ""} ${title.contact.last_name || ""}`.trim()
        : "";

    const fields = [
      escapeField(title.title),
      escapeField(title.subtitle),
      escapeField(authorName),
      escapeField(title.isbn),
      escapeField(title.genre),
      escapeField(formatDate(title.publication_date)),
      escapeField(title.publication_status),
      escapeField(title.word_count),
      escapeField(title.asin),
      escapeField(title.bisac_code),
      escapeField(title.bisac_codes?.join("; ")), // Semicolon separated for CSV
      escapeField(formatTimestamp(title.created_at)),
      escapeField(formatTimestamp(title.updated_at)),
    ];

    return fields.join(",");
  });

  // Combine with header row
  const content = [
    generateHeaderRow("titles"),
    "", // Empty line after header
    headers,
    ...rows,
  ].join("\n");

  return UTF8_BOM + content;
}

// =============================================================================
// CONTACTS CSV EXPORT
// =============================================================================

/**
 * Generate CSV export for contacts
 *
 * AC 3: Export generates CSV file
 * Uses getContacts() query pattern with tenant isolation
 * SECURITY: Exports tin_last_four (already masked), NOT tin_encrypted
 *
 * @param tenantId - Tenant UUID for isolation
 * @param filters - Optional filters (dateRange, role)
 * @returns CSV string with UTF-8 BOM
 */
export async function generateContactsCsv(
  tenantId: string,
  filters?: ExportFilters,
): Promise<string> {
  // Build query conditions
  const conditions = [eq(contacts.tenant_id, tenantId)];

  // Date range filter on created_at
  if (filters?.dateRange?.from) {
    conditions.push(gte(contacts.created_at, filters.dateRange.from));
  }
  if (filters?.dateRange?.to) {
    conditions.push(lte(contacts.created_at, filters.dateRange.to));
  }

  // Query contacts with roles
  // Following getContacts() pattern from contacts/queries.ts
  const result = await adminDb.query.contacts.findMany({
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
  let filteredResults = result;
  if (filters?.role) {
    filteredResults = result.filter((contact) =>
      contact.roles?.some((r) => r.role === filters.role),
    );
  }

  // Generate CSV headers from metadata
  const headers = CONTACT_EXPORT_FIELD_METADATA.map((m) => m.columnHeader).join(
    ",",
  );

  // Generate data rows
  const rows = filteredResults.map((contact) => {
    // Compute roles as comma-separated list
    const roles = contact.roles?.map((r) => r.role).join(", ") || "";

    const fields = [
      escapeField(contact.first_name),
      escapeField(contact.last_name),
      escapeField(contact.email),
      escapeField(contact.phone),
      escapeField(contact.address_line1),
      escapeField(contact.address_line2),
      escapeField(contact.city),
      escapeField(contact.state),
      escapeField(contact.postal_code),
      escapeField(contact.country),
      escapeField(contact.tin_last_four), // Already masked - no tin_encrypted!
      escapeField(contact.tin_type),
      escapeField(roles),
      escapeField(formatTimestamp(contact.created_at)),
    ];

    return fields.join(",");
  });

  // Combine with header row
  const content = [
    generateHeaderRow("contacts"),
    "", // Empty line after header
    headers,
    ...rows,
  ].join("\n");

  return UTF8_BOM + content;
}

// =============================================================================
// SALES CSV EXPORT
// =============================================================================

/**
 * Generate CSV export for sales
 *
 * AC 3: Export generates CSV file
 * Uses getSalesWithFilters() query pattern with tenant isolation
 * Note: Filters by sale_date (NOT transaction_date)
 *
 * @param tenantId - Tenant UUID for isolation
 * @param filters - Optional filters (dateRange, format, channel)
 * @returns CSV string with UTF-8 BOM
 */
export async function generateSalesCsv(
  tenantId: string,
  filters?: ExportFilters,
): Promise<string> {
  // Build query conditions
  const conditions = [eq(sales.tenant_id, tenantId)];

  // Date range filter on sale_date (NOT transaction_date)
  // sale_date is a date column (string format 'yyyy-MM-dd'), not timestamp
  if (filters?.dateRange?.from) {
    const fromStr = format(filters.dateRange.from, "yyyy-MM-dd");
    conditions.push(gte(sales.sale_date, fromStr));
  }
  if (filters?.dateRange?.to) {
    const toStr = format(filters.dateRange.to, "yyyy-MM-dd");
    conditions.push(lte(sales.sale_date, toStr));
  }

  // Format filter
  if (filters?.format) {
    conditions.push(eq(sales.format, filters.format));
  }

  // Channel filter
  if (filters?.channel) {
    conditions.push(eq(sales.channel, filters.channel));
  }

  // Query sales with title and author info
  // Following getSalesWithFilters() pattern from sales/queries.ts
  const result = await adminDb
    .select({
      id: sales.id,
      sale_date: sales.sale_date,
      format: sales.format,
      quantity: sales.quantity,
      unit_price: sales.unit_price,
      total_amount: sales.total_amount,
      channel: sales.channel,
      created_at: sales.created_at,
      title_name: titles.title,
      title_isbn: titles.isbn,
      author_first_name: contacts.first_name,
      author_last_name: contacts.last_name,
    })
    .from(sales)
    .innerJoin(titles, eq(sales.title_id, titles.id))
    .leftJoin(contacts, eq(titles.contact_id, contacts.id))
    .where(and(...conditions))
    .orderBy(desc(sales.sale_date), desc(sales.created_at));

  // Generate CSV headers from metadata
  const headers = SALES_EXPORT_FIELD_METADATA.map((m) => m.columnHeader).join(
    ",",
  );

  // Generate data rows
  const rows = result.map((row) => {
    // Compute author name
    const authorName =
      row.author_first_name && row.author_last_name
        ? `${row.author_first_name} ${row.author_last_name}`.trim()
        : row.author_first_name || row.author_last_name || "";

    const fields = [
      escapeField(row.title_name),
      escapeField(row.title_isbn),
      escapeField(authorName),
      escapeField(row.format),
      escapeField(row.channel),
      escapeField(row.quantity),
      escapeField(row.unit_price),
      escapeField(row.total_amount),
      escapeField(formatDate(row.sale_date)),
      escapeField(formatTimestamp(row.created_at)),
    ];

    return fields.join(",");
  });

  // Combine with header row
  const content = [
    generateHeaderRow("sales"),
    "", // Empty line after header
    headers,
    ...rows,
  ].join("\n");

  return UTF8_BOM + content;
}

// =============================================================================
// COUNT QUERIES (for sync/async threshold check)
// =============================================================================

/**
 * Get count of titles matching filters
 * Used to determine sync vs async export path
 */
export async function getTitlesExportCount(
  tenantId: string,
  filters?: ExportFilters,
): Promise<number> {
  const conditions = [eq(titles.tenant_id, tenantId)];

  if (filters?.dateRange?.from) {
    conditions.push(gte(titles.created_at, filters.dateRange.from));
  }
  if (filters?.dateRange?.to) {
    conditions.push(lte(titles.created_at, filters.dateRange.to));
  }
  if (filters?.publicationStatus) {
    conditions.push(eq(titles.publication_status, filters.publicationStatus));
  }

  const result = await adminDb.query.titles.findMany({
    where: and(...conditions),
    columns: { id: true },
  });

  return result.length;
}

/**
 * Get count of contacts matching filters
 * Used to determine sync vs async export path
 */
export async function getContactsExportCount(
  tenantId: string,
  filters?: ExportFilters,
): Promise<number> {
  const conditions = [eq(contacts.tenant_id, tenantId)];

  if (filters?.dateRange?.from) {
    conditions.push(gte(contacts.created_at, filters.dateRange.from));
  }
  if (filters?.dateRange?.to) {
    conditions.push(lte(contacts.created_at, filters.dateRange.to));
  }

  const result = await adminDb.query.contacts.findMany({
    where: and(...conditions),
    with: { roles: true },
    columns: { id: true },
  });

  // Filter by role if specified
  if (filters?.role) {
    return result.filter((c) => c.roles?.some((r) => r.role === filters.role))
      .length;
  }

  return result.length;
}

/**
 * Get count of sales matching filters
 * Used to determine sync vs async export path
 */
export async function getSalesExportCount(
  tenantId: string,
  filters?: ExportFilters,
): Promise<number> {
  const conditions = [eq(sales.tenant_id, tenantId)];

  // sale_date is a date column (string format 'yyyy-MM-dd'), not timestamp
  if (filters?.dateRange?.from) {
    const fromStr = format(filters.dateRange.from, "yyyy-MM-dd");
    conditions.push(gte(sales.sale_date, fromStr));
  }
  if (filters?.dateRange?.to) {
    const toStr = format(filters.dateRange.to, "yyyy-MM-dd");
    conditions.push(lte(sales.sale_date, toStr));
  }
  if (filters?.format) {
    conditions.push(eq(sales.format, filters.format));
  }
  if (filters?.channel) {
    conditions.push(eq(sales.channel, filters.channel));
  }

  const result = await adminDb.query.sales.findMany({
    where: and(...conditions),
    columns: { id: true },
  });

  return result.length;
}
