import { desc, eq } from "drizzle-orm";
import type { CsvImport } from "@/db/schema/csv-imports";
import { csvImports } from "@/db/schema/csv-imports";
import { getCurrentTenantId, getDb } from "@/lib/auth";

/**
 * Import/Export Module Queries
 *
 * Story: 19.1 - Import Catalog via CSV
 *
 * FRs: FR170, FR171
 *
 * Provides query functions for import history and tracking.
 */

/**
 * Get import history for the current tenant
 *
 * @param limit - Maximum number of imports to return (default: 20)
 * @returns Array of CSV imports sorted by created_at descending
 */
export async function getImportHistory(limit = 20): Promise<CsvImport[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const imports = await db
    .select()
    .from(csvImports)
    .where(eq(csvImports.tenant_id, tenantId))
    .orderBy(desc(csvImports.created_at))
    .limit(limit);

  return imports;
}

/**
 * Get a specific import by ID
 *
 * @param importId - The import ID to look up
 * @returns The import record or null if not found
 */
export async function getImportById(
  importId: string,
): Promise<CsvImport | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const [importRecord] = await db
    .select()
    .from(csvImports)
    .where(eq(csvImports.id, importId))
    .limit(1);

  // Verify tenant isolation
  if (!importRecord || importRecord.tenant_id !== tenantId) {
    return null;
  }

  return importRecord;
}

/**
 * Get recent imports count for the current tenant
 *
 * @returns Total number of imports
 */
export async function getImportCount(): Promise<number> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const imports = await db
    .select()
    .from(csvImports)
    .where(eq(csvImports.tenant_id, tenantId));

  return imports.length;
}

/**
 * Get imports by type (titles, contacts, sales)
 *
 * @param importType - The type of imports to retrieve
 * @param limit - Maximum number of imports to return
 * @returns Array of CSV imports of the specified type
 */
export async function getImportsByType(
  importType: "titles" | "contacts" | "sales",
  limit = 20,
): Promise<CsvImport[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const imports = await db
    .select()
    .from(csvImports)
    .where(eq(csvImports.tenant_id, tenantId))
    .orderBy(desc(csvImports.created_at))
    .limit(limit);

  // Filter by type in JS since we want to use the tenant index
  return imports.filter((i) => i.import_type === importType);
}
