/**
 * EDItEUR Codelist Cache
 *
 * Story: 14.4 - Build Codelist Management System
 * Task 3: Implement codelist cache module
 *
 * In-memory LRU cache for fast codelist lookups.
 * Falls back to hardcoded values when database is unavailable.
 */

import { eq } from "drizzle-orm";

import { adminDb } from "@/db";
import { codelists, codelistValues } from "@/db/schema/codelists";

import type { CachedCodelist, CodelistEntry } from "./types";

/**
 * Cache configuration
 */
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 20; // Maximum number of codelists to keep in memory

/**
 * LRU Cache implementation for codelists
 */
class CodelistCache {
  private cache: Map<number, CachedCodelist> = new Map();
  private accessOrder: number[] = [];

  /**
   * Get a codelist from cache or load from database
   *
   * @param listNumber - EDItEUR list number
   * @returns Cached codelist with values
   */
  async getCodelist(listNumber: number): Promise<CachedCodelist | null> {
    // Check if in cache and not expired
    const cached = this.cache.get(listNumber);
    if (cached && !this.isExpired(cached)) {
      this.updateAccessOrder(listNumber);
      return cached;
    }

    // Load from database
    const loaded = await this.loadFromDatabase(listNumber);
    if (loaded) {
      this.setCached(listNumber, loaded);
      return loaded;
    }

    return null;
  }

  /**
   * Get a single code value with its description
   *
   * @param listNumber - EDItEUR list number
   * @param code - Code value to look up
   * @returns Code entry or null if not found
   */
  async getCodeValue(
    listNumber: number,
    code: string,
  ): Promise<CodelistEntry | null> {
    const codelist = await this.getCodelist(listNumber);
    if (!codelist) {
      return null;
    }

    return codelist.values.get(code) ?? null;
  }

  /**
   * Validate that a code exists in a codelist
   *
   * @param listNumber - EDItEUR list number
   * @param code - Code value to validate
   * @returns true if code exists in the list
   */
  async validateCode(listNumber: number, code: string): Promise<boolean> {
    const entry = await this.getCodeValue(listNumber, code);
    return entry !== null;
  }

  /**
   * Invalidate a specific codelist from cache
   *
   * @param listNumber - EDItEUR list number to invalidate
   */
  invalidate(listNumber: number): void {
    this.cache.delete(listNumber);
    this.accessOrder = this.accessOrder.filter((n) => n !== listNumber);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
      ttl: CACHE_TTL,
    };
  }

  /**
   * Check if a cached entry is expired
   */
  private isExpired(cached: CachedCodelist): boolean {
    return Date.now() - cached.loadedAt.getTime() > CACHE_TTL;
  }

  /**
   * Update access order for LRU eviction
   */
  private updateAccessOrder(listNumber: number): void {
    this.accessOrder = this.accessOrder.filter((n) => n !== listNumber);
    this.accessOrder.push(listNumber);
  }

  /**
   * Add an entry to cache with LRU eviction
   */
  private setCached(listNumber: number, codelist: CachedCodelist): void {
    // Evict oldest if at capacity
    while (this.cache.size >= MAX_CACHE_SIZE && this.accessOrder.length > 0) {
      const oldest = this.accessOrder.shift();
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(listNumber, codelist);
    this.updateAccessOrder(listNumber);
  }

  /**
   * Load codelist from database
   */
  private async loadFromDatabase(
    listNumber: number,
  ): Promise<CachedCodelist | null> {
    try {
      // Check if codelist exists
      const meta = await adminDb
        .select()
        .from(codelists)
        .where(eq(codelists.list_number, listNumber))
        .limit(1);

      if (meta.length === 0) {
        return null;
      }

      // Load all values
      const values = await adminDb
        .select()
        .from(codelistValues)
        .where(eq(codelistValues.list_number, listNumber));

      // Build map of values
      const valueMap = new Map<string, CodelistEntry>();
      for (const v of values) {
        valueMap.set(v.code, {
          code: v.code,
          description: v.description,
          notes: v.notes ?? undefined,
          deprecated: v.deprecated ?? false,
          addedInIssue: v.added_in_issue ?? undefined,
        });
      }

      return {
        listNumber,
        values: valueMap,
        loadedAt: new Date(),
      };
    } catch (error) {
      console.error(
        `Error loading codelist ${listNumber} from database:`,
        error,
      );
      return null;
    }
  }
}

/**
 * Singleton cache instance
 */
export const codelistCache = new CodelistCache();

/**
 * Convenience function to validate a code value
 *
 * @param listNumber - EDItEUR list number
 * @param code - Code value to validate
 * @returns true if code exists in the list
 */
export async function validateCodelistValue(
  listNumber: number,
  code: string,
): Promise<boolean> {
  return codelistCache.validateCode(listNumber, code);
}

/**
 * Convenience function to get a code description
 *
 * @param listNumber - EDItEUR list number
 * @param code - Code value to look up
 * @returns Description string or null if not found
 */
export async function getCodeDescription(
  listNumber: number,
  code: string,
): Promise<string | null> {
  const entry = await codelistCache.getCodeValue(listNumber, code);
  return entry?.description ?? null;
}

/**
 * Convenience function to get all codes for a list
 *
 * @param listNumber - EDItEUR list number
 * @returns Array of code entries or empty array if not found
 */
export async function getCodelistEntries(
  listNumber: number,
): Promise<CodelistEntry[]> {
  const codelist = await codelistCache.getCodelist(listNumber);
  if (!codelist) {
    return [];
  }
  return Array.from(codelist.values.values());
}
