/**
 * EDItEUR Codelist Loader
 *
 * Story: 14.4 - Build Codelist Management System
 * Task 2: Implement codelist loader module
 *
 * Loads ONIX codelists from bundled JSON files and persists to database.
 * Falls back to bundled data when database is unavailable.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { eq } from "drizzle-orm";

import { adminDb } from "@/db";
import {
  codelists,
  codelistValues,
  type InsertCodelist,
  type InsertCodelistValue,
} from "@/db/schema/codelists";

import type {
  CodelistEntry,
  CodelistLoadResult,
  EditeurCodeJSON,
  EditeurCodelistJSON,
  UpdateCheckResult,
} from "./types";
import { REQUIRED_CODELISTS } from "./types";

/**
 * Path to bundled codelist JSON files
 */
const DATA_DIR = path.join(process.cwd(), "src/modules/onix/codelists/data");

/**
 * Current bundled issue number (Issue 68 = January 2025)
 */
export const BUNDLED_ISSUE_NUMBER = 68;

/**
 * Parse a single code entry from EDItEUR JSON format
 */
function parseCodeEntry(code: EditeurCodeJSON): CodelistEntry {
  return {
    code: code.CodeValue,
    description: code.CodeDescription,
    notes: code.CodeNotes,
    deprecated: code.Deprecated === "true",
    addedInIssue: code.IssueNumber,
  };
}

/**
 * Parse EDItEUR codelist JSON into internal format
 *
 * @param json - Raw EDItEUR JSON content
 * @returns Parsed codelist with entries
 */
export function parseCodelistJSON(json: EditeurCodelistJSON): {
  listNumber: number;
  issueNumber: number;
  listName: string;
  entries: CodelistEntry[];
} {
  return {
    listNumber: parseInt(json.CodeListNumber, 10),
    issueNumber: json.IssueNumber,
    listName: json.ListName,
    entries: json.Codes.map(parseCodeEntry),
  };
}

/**
 * Fetch codelist from bundled JSON file
 *
 * @param listNumber - EDItEUR list number to load
 * @returns Parsed codelist data or null if not found
 */
export async function fetchCodelistFromSource(
  listNumber: number,
): Promise<ReturnType<typeof parseCodelistJSON> | null> {
  const filename = `codelist-${listNumber}.json`;
  const filepath = path.join(DATA_DIR, filename);

  try {
    if (!fs.existsSync(filepath)) {
      console.warn(`Codelist file not found: ${filepath}`);
      return null;
    }

    const content = fs.readFileSync(filepath, "utf-8");
    const json = JSON.parse(content) as EditeurCodelistJSON;
    return parseCodelistJSON(json);
  } catch (error) {
    console.error(`Error loading codelist ${listNumber}:`, error);
    return null;
  }
}

/**
 * Save a codelist and its values to the database
 *
 * @param listNumber - EDItEUR list number
 * @param issueNumber - Issue number of this codelist version
 * @param listName - Human-readable name
 * @param entries - Code entries to save
 */
export async function saveCodelist(
  listNumber: number,
  issueNumber: number,
  listName: string,
  entries: CodelistEntry[],
): Promise<CodelistLoadResult> {
  try {
    // Check if codelist already exists
    const existing = await adminDb
      .select()
      .from(codelists)
      .where(eq(codelists.list_number, listNumber))
      .limit(1);

    if (existing.length > 0) {
      // Update existing codelist metadata
      await adminDb
        .update(codelists)
        .set({
          issue_number: issueNumber,
          list_name: listName,
          value_count: entries.length,
          updated_at: new Date(),
        })
        .where(eq(codelists.list_number, listNumber));

      // Delete existing values and insert new ones
      await adminDb
        .delete(codelistValues)
        .where(eq(codelistValues.list_number, listNumber));
    } else {
      // Insert new codelist metadata
      const newCodelist: InsertCodelist = {
        list_number: listNumber,
        issue_number: issueNumber,
        list_name: listName,
        value_count: entries.length,
      };
      await adminDb.insert(codelists).values(newCodelist);
    }

    // Insert all values
    if (entries.length > 0) {
      const values: InsertCodelistValue[] = entries.map((entry) => ({
        list_number: listNumber,
        code: entry.code,
        description: entry.description,
        notes: entry.notes ?? null,
        deprecated: entry.deprecated ?? false,
        added_in_issue: entry.addedInIssue ?? null,
      }));
      await adminDb.insert(codelistValues).values(values);
    }

    return {
      listNumber,
      success: true,
      valueCount: entries.length,
    };
  } catch (error) {
    console.error(`Error saving codelist ${listNumber}:`, error);
    return {
      listNumber,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Load a single codelist from bundled JSON and save to database
 *
 * @param listNumber - EDItEUR list number to load
 * @returns Result of the load operation
 */
export async function loadCodelist(
  listNumber: number,
): Promise<CodelistLoadResult> {
  const data = await fetchCodelistFromSource(listNumber);

  if (!data) {
    return {
      listNumber,
      success: false,
      error: `Codelist ${listNumber} not found in bundled data`,
    };
  }

  return saveCodelist(
    data.listNumber,
    data.issueNumber,
    data.listName,
    data.entries,
  );
}

/**
 * Load all required codelists from bundled JSON
 *
 * @returns Array of load results
 */
export async function loadAllCodelists(): Promise<CodelistLoadResult[]> {
  const results: CodelistLoadResult[] = [];

  for (const listNumber of REQUIRED_CODELISTS) {
    const result = await loadCodelist(listNumber);
    results.push(result);
  }

  return results;
}

/**
 * Check if a codelist needs updating by comparing issue numbers
 *
 * @param listNumber - EDItEUR list number to check
 * @returns Update check result
 */
export async function checkForUpdate(
  listNumber: number,
): Promise<UpdateCheckResult> {
  // Get current database version
  const current = await adminDb
    .select({ issue_number: codelists.issue_number })
    .from(codelists)
    .where(eq(codelists.list_number, listNumber))
    .limit(1);

  const currentIssue = current[0]?.issue_number ?? 0;

  // Compare with bundled version
  const bundledData = await fetchCodelistFromSource(listNumber);
  const availableIssue = bundledData?.issueNumber ?? BUNDLED_ISSUE_NUMBER;

  return {
    listNumber,
    currentIssue,
    availableIssue,
    needsUpdate: availableIssue > currentIssue,
  };
}

/**
 * Check all required codelists for updates
 *
 * @returns Array of update check results
 */
export async function checkForUpdates(): Promise<UpdateCheckResult[]> {
  const results: UpdateCheckResult[] = [];

  for (const listNumber of REQUIRED_CODELISTS) {
    const result = await checkForUpdate(listNumber);
    results.push(result);
  }

  return results;
}

/**
 * Update a single codelist if newer version available
 *
 * @param listNumber - EDItEUR list number to update
 * @returns Load result
 */
export async function updateCodelist(
  listNumber: number,
): Promise<CodelistLoadResult> {
  const check = await checkForUpdate(listNumber);

  if (!check.needsUpdate) {
    return {
      listNumber,
      success: true,
      error: "Already up to date",
    };
  }

  return loadCodelist(listNumber);
}

/**
 * Update all codelists that need updating
 *
 * @returns Array of load results for updated codelists
 */
export async function updateAllCodelists(): Promise<CodelistLoadResult[]> {
  const results: CodelistLoadResult[] = [];

  for (const listNumber of REQUIRED_CODELISTS) {
    const result = await updateCodelist(listNumber);
    results.push(result);
  }

  return results;
}
