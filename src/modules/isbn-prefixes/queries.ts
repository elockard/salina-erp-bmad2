/**
 * ISBN Prefixes Queries
 *
 * Database query functions for ISBN prefix operations.
 * Story 7.4: Implement Publisher ISBN Prefix System
 */

"use server";

import { and, eq, ilike } from "drizzle-orm";
import { isbnPrefixes } from "@/db/schema/isbn-prefixes";
import { isbns } from "@/db/schema/isbns";
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import { MANAGE_SETTINGS } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import type { IsbnPrefixGenerationStatus } from "./types";
import {
  calculateAvailablePercentage,
  formatBlockSize,
  formatPrefix,
} from "./utils";

/**
 * Filter options for prefix queries
 * Story 7.6: Removed type filter - ISBNs are unified without type distinction
 */
export interface PrefixQueryFilters {
  status?: IsbnPrefixGenerationStatus;
  search?: string;
}

/**
 * Prefix list item for table display
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
export interface PrefixListItem {
  id: string;
  prefix: string;
  formattedPrefix: string;
  blockSize: number;
  formattedBlockSize: string;
  totalIsbns: number;
  availableCount: number;
  assignedCount: number;
  availablePercentage: number;
  generationStatus: IsbnPrefixGenerationStatus;
  generationError: string | null;
  createdAt: Date;
  description: string | null;
}

/**
 * Get all ISBN prefixes for current tenant
 * Permission: MANAGE_SETTINGS (Admin/Owner only)
 *
 * @param filters - Optional filters for type, status, search
 * @returns Array of prefix list items
 */
export async function getIsbnPrefixes(
  filters?: PrefixQueryFilters,
): Promise<ActionResult<PrefixListItem[]>> {
  try {
    await requirePermission(MANAGE_SETTINGS);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Build conditions
    // Story 7.6: Removed type filter - ISBNs are unified without type distinction
    const conditions = [eq(isbnPrefixes.tenant_id, tenantId)];

    if (filters?.status) {
      conditions.push(eq(isbnPrefixes.generation_status, filters.status));
    }

    if (filters?.search) {
      conditions.push(ilike(isbnPrefixes.prefix, `%${filters.search}%`));
    }

    const results = await db.query.isbnPrefixes.findMany({
      where: and(...conditions),
      orderBy: (prefixes, { desc }) => [desc(prefixes.created_at)],
    });

    // Story 7.6: Removed type field from mapping - ISBNs are unified
    const items: PrefixListItem[] = results.map((p) => ({
      id: p.id,
      prefix: p.prefix,
      formattedPrefix: formatPrefix(p.prefix),
      blockSize: p.block_size,
      formattedBlockSize: formatBlockSize(
        p.block_size as 10 | 100 | 1000 | 10000 | 100000 | 1000000,
      ),
      totalIsbns: p.total_isbns,
      availableCount: p.available_count,
      assignedCount: p.assigned_count,
      availablePercentage: calculateAvailablePercentage(
        p.available_count,
        p.total_isbns,
      ),
      generationStatus: p.generation_status as IsbnPrefixGenerationStatus,
      generationError: p.generation_error,
      createdAt: p.created_at,
      description: p.description,
    }));

    return { success: true, data: items };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view ISBN prefixes",
      };
    }

    console.error("getIsbnPrefixes error:", error);
    return { success: false, error: "Failed to load ISBN prefixes" };
  }
}

/**
 * Prefix detail with creator information
 */
export interface PrefixDetail extends PrefixListItem {
  createdByUser: {
    id: string;
    email: string;
  } | null;
}

/**
 * Get a single ISBN prefix by ID with creator details
 * Permission: MANAGE_SETTINGS (Admin/Owner only)
 *
 * @param id - Prefix UUID
 * @returns Prefix detail or null if not found
 */
export async function getIsbnPrefixById(
  id: string,
): Promise<ActionResult<PrefixDetail>> {
  try {
    await requirePermission(MANAGE_SETTINGS);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const result = await db.query.isbnPrefixes.findFirst({
      where: and(eq(isbnPrefixes.id, id), eq(isbnPrefixes.tenant_id, tenantId)),
      with: {
        createdByUser: {
          columns: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!result) {
      return { success: false, error: "ISBN prefix not found" };
    }

    // Story 7.6: Removed type field - ISBNs are unified without type distinction
    const detail: PrefixDetail = {
      id: result.id,
      prefix: result.prefix,
      formattedPrefix: formatPrefix(result.prefix),
      blockSize: result.block_size,
      formattedBlockSize: formatBlockSize(
        result.block_size as 10 | 100 | 1000 | 10000 | 100000 | 1000000,
      ),
      totalIsbns: result.total_isbns,
      availableCount: result.available_count,
      assignedCount: result.assigned_count,
      availablePercentage: calculateAvailablePercentage(
        result.available_count,
        result.total_isbns,
      ),
      generationStatus: result.generation_status as IsbnPrefixGenerationStatus,
      generationError: result.generation_error,
      createdAt: result.created_at,
      description: result.description,
      createdByUser: result.createdByUser
        ? {
            id: result.createdByUser.id,
            email: result.createdByUser.email ?? "",
          }
        : null,
    };

    return { success: true, data: detail };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view ISBN prefix details",
      };
    }

    console.error("getIsbnPrefixById error:", error);
    return { success: false, error: "Failed to load ISBN prefix" };
  }
}

/**
 * Check if a prefix already exists for the current tenant
 * Used during prefix registration validation
 *
 * @param prefix - Publisher prefix (normalized or with hyphens)
 * @returns true if prefix exists
 */
export async function checkPrefixExists(prefix: string): Promise<boolean> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Normalize the prefix for comparison
  const normalizedPrefix = prefix.replace(/[-\s]/g, "");

  const existing = await db.query.isbnPrefixes.findFirst({
    where: and(
      eq(isbnPrefixes.tenant_id, tenantId),
      eq(isbnPrefixes.prefix, normalizedPrefix),
    ),
  });

  return existing !== undefined;
}

/**
 * Sample ISBN data for prefix detail view
 */
export interface SampleIsbn {
  id: string;
  isbn_13: string;
  status: string;
  assignedToTitleId: string | null;
}

/**
 * Get first N ISBNs for a prefix (for detail view)
 * Permission: MANAGE_SETTINGS (Admin/Owner only)
 *
 * @param prefixId - Prefix UUID
 * @param limit - Maximum ISBNs to return (default 50)
 * @returns Array of sample ISBNs
 */
export async function getPrefixSampleIsbns(
  prefixId: string,
  limit = 50,
): Promise<ActionResult<SampleIsbn[]>> {
  try {
    await requirePermission(MANAGE_SETTINGS);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Verify prefix belongs to tenant
    const prefix = await db.query.isbnPrefixes.findFirst({
      where: and(
        eq(isbnPrefixes.id, prefixId),
        eq(isbnPrefixes.tenant_id, tenantId),
      ),
    });

    if (!prefix) {
      return { success: false, error: "ISBN prefix not found" };
    }

    // Get sample ISBNs for this prefix
    const results = await db
      .select({
        id: isbns.id,
        isbn_13: isbns.isbn_13,
        status: isbns.status,
        assignedToTitleId: isbns.assigned_to_title_id,
      })
      .from(isbns)
      .where(eq(isbns.prefix_id, prefixId))
      .orderBy(isbns.isbn_13)
      .limit(limit);

    return {
      success: true,
      data: results.map((r) => ({
        id: r.id,
        isbn_13: r.isbn_13,
        status: r.status,
        assignedToTitleId: r.assignedToTitleId,
      })),
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view ISBN details",
      };
    }

    console.error("getPrefixSampleIsbns error:", error);
    return { success: false, error: "Failed to load ISBN samples" };
  }
}

/**
 * Prefix option for filter dropdowns
 */
export interface PrefixFilterOption {
  id: string;
  prefix: string;
  formattedPrefix: string;
}

/**
 * Get prefix options for filter dropdowns
 * Available to all authenticated users (not just MANAGE_SETTINGS)
 * Used in ISBN pool filter component
 *
 * Story 7.4 AC-7.4.7: Filter ISBN pool table by prefix
 *
 * @returns Array of prefix filter options
 */
export async function getPrefixFilterOptions(): Promise<
  ActionResult<PrefixFilterOption[]>
> {
  try {
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const results = await db.query.isbnPrefixes.findMany({
      where: and(
        eq(isbnPrefixes.tenant_id, tenantId),
        eq(isbnPrefixes.generation_status, "completed"),
      ),
      columns: {
        id: true,
        prefix: true,
      },
      orderBy: (prefixes, { asc }) => [asc(prefixes.prefix)],
    });

    return {
      success: true,
      data: results.map((p) => ({
        id: p.id,
        prefix: p.prefix,
        formattedPrefix: formatPrefix(p.prefix),
      })),
    };
  } catch (error) {
    console.error("getPrefixFilterOptions error:", error);
    return { success: false, error: "Failed to load prefix options" };
  }
}

/**
 * Get prefix generation status for polling
 * Used to check async generation progress
 *
 * @param prefixId - Prefix UUID
 * @returns Current generation status
 */
export async function getPrefixGenerationStatus(prefixId: string): Promise<
  ActionResult<{
    status: IsbnPrefixGenerationStatus;
    error: string | null;
    availableCount: number;
    totalIsbns: number;
  }>
> {
  try {
    await requirePermission(MANAGE_SETTINGS);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const result = await db.query.isbnPrefixes.findFirst({
      where: and(
        eq(isbnPrefixes.id, prefixId),
        eq(isbnPrefixes.tenant_id, tenantId),
      ),
      columns: {
        generation_status: true,
        generation_error: true,
        available_count: true,
        total_isbns: true,
      },
    });

    if (!result) {
      return { success: false, error: "ISBN prefix not found" };
    }

    return {
      success: true,
      data: {
        status: result.generation_status as IsbnPrefixGenerationStatus,
        error: result.generation_error,
        availableCount: result.available_count,
        totalIsbns: result.total_isbns,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view prefix status",
      };
    }

    console.error("getPrefixGenerationStatus error:", error);
    return { success: false, error: "Failed to load generation status" };
  }
}
