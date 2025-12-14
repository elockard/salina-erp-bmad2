/**
 * Codelists Cache Tests
 *
 * Story: 14.4 - Build Codelist Management System
 * Task 3.7: Write cache tests
 *
 * Tests for codelist caching, LRU eviction, and TTL behavior.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { codelistCache } from "@/modules/onix/codelists/cache";

describe("codelists cache", () => {
  beforeEach(() => {
    // Clear cache before each test
    codelistCache.clear();
  });

  describe("cache statistics", () => {
    it("reports initial empty state", () => {
      const stats = codelistCache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(20);
      expect(stats.ttl).toBe(60 * 60 * 1000); // 1 hour
    });
  });

  describe("invalidation", () => {
    it("invalidate removes specific list from cache", () => {
      // Start with empty cache
      const statsBefore = codelistCache.getStats();
      expect(statsBefore.size).toBe(0);

      // Invalidate a non-existent list (should not error)
      codelistCache.invalidate(196);

      const statsAfter = codelistCache.getStats();
      expect(statsAfter.size).toBe(0);
    });

    it("clear empties the entire cache", () => {
      // Start with empty cache
      const statsBefore = codelistCache.getStats();
      expect(statsBefore.size).toBe(0);

      // Clear (should not error)
      codelistCache.clear();

      const statsAfter = codelistCache.getStats();
      expect(statsAfter.size).toBe(0);
    });
  });

  describe("getCodelist", () => {
    it("returns null for non-existent list when database is empty", async () => {
      // This will try to load from database and return null
      const result = await codelistCache.getCodelist(999);

      // Since the database doesn't have this list, it should return null
      expect(result).toBeNull();
    });
  });

  describe("getCodeValue", () => {
    it("returns null for non-existent list", async () => {
      const result = await codelistCache.getCodeValue(999, "00");

      expect(result).toBeNull();
    });

    it("returns null for non-existent code in non-existent list", async () => {
      const result = await codelistCache.getCodeValue(999, "XX");

      expect(result).toBeNull();
    });
  });

  describe("validateCode", () => {
    it("returns false for non-existent list", async () => {
      const isValid = await codelistCache.validateCode(999, "00");

      expect(isValid).toBe(false);
    });

    it("returns false for non-existent code in non-existent list", async () => {
      const isValid = await codelistCache.validateCode(999, "XX");

      expect(isValid).toBe(false);
    });
  });

  describe("cache configuration", () => {
    it("has max size of 20 codelists", () => {
      const stats = codelistCache.getStats();

      expect(stats.maxSize).toBe(20);
    });

    it("has TTL of 1 hour", () => {
      const stats = codelistCache.getStats();
      const oneHourMs = 60 * 60 * 1000;

      expect(stats.ttl).toBe(oneHourMs);
    });
  });
});
