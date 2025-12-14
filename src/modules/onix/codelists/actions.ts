/**
 * Codelist Server Actions
 *
 * Story: 14.4 - Build Codelist Management System
 * Task 8: Server actions for codelist management
 *
 * Server actions for platform admin codelist operations.
 * All update operations require platform admin access.
 */

"use server";

import { adminDb } from "@/db";
import { codelists } from "@/db/schema/codelists";
import { requirePlatformAdmin } from "@/lib/platform-admin";

import { codelistCache } from "./cache";
import {
  checkForUpdate,
  checkForUpdates,
  loadAllCodelists,
  loadCodelist,
  updateAllCodelists,
  updateCodelist,
} from "./loader";
import type {
  CodelistLoadResult,
  CodelistMetadata,
  UpdateCheckResult,
} from "./types";
import { REQUIRED_CODELISTS } from "./types";

/**
 * Get all loaded codelists with metadata
 * Does not require platform admin (read-only operation)
 *
 * @returns Array of codelist metadata
 */
export async function getCodelists(): Promise<CodelistMetadata[]> {
  const results = await adminDb
    .select({
      list_number: codelists.list_number,
      issue_number: codelists.issue_number,
      list_name: codelists.list_name,
      value_count: codelists.value_count,
      loaded_at: codelists.loaded_at,
    })
    .from(codelists)
    .orderBy(codelists.list_number);

  return results.map((r) => ({
    listNumber: r.list_number,
    issueNumber: r.issue_number,
    listName: r.list_name,
    valueCount: r.value_count,
    loadedAt: r.loaded_at,
  }));
}

/**
 * Check all required codelists for available updates
 * Does not require platform admin (read-only operation)
 *
 * @returns Array of update check results
 */
export async function checkCodelistUpdates(): Promise<UpdateCheckResult[]> {
  return checkForUpdates();
}

/**
 * Check a specific codelist for updates
 * Does not require platform admin (read-only operation)
 *
 * @param listNumber - EDItEUR list number to check
 * @returns Update check result
 */
export async function checkCodelistUpdate(
  listNumber: number,
): Promise<UpdateCheckResult> {
  return checkForUpdate(listNumber);
}

/**
 * Update a specific codelist from bundled data
 * Requires platform admin access
 *
 * @param listNumber - EDItEUR list number to update
 * @returns Load result
 */
export async function updateCodelistAction(
  listNumber: number,
): Promise<CodelistLoadResult> {
  await requirePlatformAdmin();

  // Validate that this is a supported codelist
  if (
    !REQUIRED_CODELISTS.includes(
      listNumber as (typeof REQUIRED_CODELISTS)[number],
    )
  ) {
    return {
      listNumber,
      success: false,
      error: `Codelist ${listNumber} is not a supported list`,
    };
  }

  const result = await updateCodelist(listNumber);

  // Invalidate cache on successful update
  if (result.success) {
    codelistCache.invalidate(listNumber);
  }

  return result;
}

/**
 * Update all codelists from bundled data
 * Requires platform admin access
 *
 * @returns Array of load results
 */
export async function updateAllCodelistsAction(): Promise<
  CodelistLoadResult[]
> {
  await requirePlatformAdmin();

  const results = await updateAllCodelists();

  // Invalidate cache for all successfully updated lists
  for (const result of results) {
    if (result.success) {
      codelistCache.invalidate(result.listNumber);
    }
  }

  return results;
}

/**
 * Load a specific codelist from bundled data (initial seed)
 * Requires platform admin access
 *
 * @param listNumber - EDItEUR list number to load
 * @returns Load result
 */
export async function loadCodelistAction(
  listNumber: number,
): Promise<CodelistLoadResult> {
  await requirePlatformAdmin();

  // Validate that this is a supported codelist
  if (
    !REQUIRED_CODELISTS.includes(
      listNumber as (typeof REQUIRED_CODELISTS)[number],
    )
  ) {
    return {
      listNumber,
      success: false,
      error: `Codelist ${listNumber} is not a supported list`,
    };
  }

  const result = await loadCodelist(listNumber);

  // Invalidate cache on successful load
  if (result.success) {
    codelistCache.invalidate(listNumber);
  }

  return result;
}

/**
 * Load all required codelists from bundled data (initial seed)
 * Requires platform admin access
 *
 * @returns Array of load results
 */
export async function loadAllCodelistsAction(): Promise<CodelistLoadResult[]> {
  await requirePlatformAdmin();

  const results = await loadAllCodelists();

  // Clear entire cache after bulk load
  codelistCache.clear();

  return results;
}

/**
 * Get required codelist numbers
 * Does not require platform admin (informational)
 *
 * @returns Array of required codelist numbers
 */
export async function getRequiredCodelistNumbers(): Promise<number[]> {
  return [...REQUIRED_CODELISTS];
}

/**
 * Check if all required codelists are loaded
 * Does not require platform admin (informational)
 *
 * @returns Object with loaded status and missing lists
 */
export async function checkCodelistsLoaded(): Promise<{
  allLoaded: boolean;
  loadedLists: number[];
  missingLists: number[];
}> {
  const loaded = await getCodelists();
  const loadedNumbers = loaded.map((l) => l.listNumber);

  const missingLists = REQUIRED_CODELISTS.filter(
    (num) => !loadedNumbers.includes(num),
  );

  return {
    allLoaded: missingLists.length === 0,
    loadedLists: loadedNumbers,
    missingLists: [...missingLists],
  };
}
