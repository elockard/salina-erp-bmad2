/**
 * API Pagination Utilities Tests
 *
 * Story 15.2 - Task 1: Cursor-based pagination helpers
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIMIT,
  decodeCursor,
  encodeCursor,
  MAX_LIMIT,
  parsePaginationParams,
} from "@/modules/api/utils/pagination";

describe("API Pagination Utilities", () => {
  describe("encodeCursor", () => {
    it("encodes id and timestamp to base64", () => {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const timestamp = new Date("2024-01-15T10:30:00Z");

      const cursor = encodeCursor(id, timestamp);

      expect(cursor).toBeTruthy();
      expect(typeof cursor).toBe("string");
      // Should be valid base64
      expect(() => Buffer.from(cursor, "base64")).not.toThrow();
    });

    it("produces different cursors for different timestamps", () => {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const ts1 = new Date("2024-01-15T10:30:00Z");
      const ts2 = new Date("2024-01-16T10:30:00Z");

      const cursor1 = encodeCursor(id, ts1);
      const cursor2 = encodeCursor(id, ts2);

      expect(cursor1).not.toBe(cursor2);
    });
  });

  describe("decodeCursor", () => {
    it("decodes valid cursor back to original values", () => {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const timestamp = new Date("2024-01-15T10:30:00Z");

      const cursor = encodeCursor(id, timestamp);
      const decoded = decodeCursor(cursor);

      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe(id);
      expect(decoded?.ts.getTime()).toBe(timestamp.getTime());
    });

    it("returns null for invalid base64", () => {
      const result = decodeCursor("not-valid-base64!!!");

      expect(result).toBeNull();
    });

    it("returns null for valid base64 but invalid JSON", () => {
      const invalidJson = Buffer.from("not json").toString("base64");
      const result = decodeCursor(invalidJson);

      expect(result).toBeNull();
    });

    it("returns null for valid JSON but missing fields", () => {
      const missingFields = Buffer.from(
        JSON.stringify({ foo: "bar" }),
      ).toString("base64");
      const result = decodeCursor(missingFields);

      expect(result).toBeNull();
    });

    it("returns null for empty string", () => {
      const result = decodeCursor("");

      expect(result).toBeNull();
    });
  });

  describe("parsePaginationParams", () => {
    it("returns defaults when no params provided", () => {
      const params = new URLSearchParams();
      const result = parsePaginationParams(params);

      expect(result.limit).toBe(DEFAULT_LIMIT);
      expect(result.cursor).toBeUndefined();
    });

    it("parses valid limit", () => {
      const params = new URLSearchParams({ limit: "50" });
      const result = parsePaginationParams(params);

      expect(result.limit).toBe(50);
    });

    it("clamps limit to MAX_LIMIT", () => {
      const params = new URLSearchParams({ limit: "500" });
      const result = parsePaginationParams(params);

      expect(result.limit).toBe(MAX_LIMIT);
    });

    it("uses DEFAULT_LIMIT for invalid limit", () => {
      const params = new URLSearchParams({ limit: "abc" });
      const result = parsePaginationParams(params);

      expect(result.limit).toBe(DEFAULT_LIMIT);
    });

    it("uses DEFAULT_LIMIT for negative limit", () => {
      const params = new URLSearchParams({ limit: "-5" });
      const result = parsePaginationParams(params);

      expect(result.limit).toBe(DEFAULT_LIMIT);
    });

    it("uses DEFAULT_LIMIT for zero limit", () => {
      const params = new URLSearchParams({ limit: "0" });
      const result = parsePaginationParams(params);

      expect(result.limit).toBe(DEFAULT_LIMIT);
    });

    it("preserves cursor param", () => {
      const cursor =
        "eyJpZCI6IjEyMyIsInRzIjoiMjAyNC0wMS0xNVQxMDozMDowMC4wMDBaIn0=";
      const params = new URLSearchParams({ cursor });
      const result = parsePaginationParams(params);

      expect(result.cursor).toBe(cursor);
    });
  });

  describe("constants", () => {
    it("DEFAULT_LIMIT is 20", () => {
      expect(DEFAULT_LIMIT).toBe(20);
    });

    it("MAX_LIMIT is 100", () => {
      expect(MAX_LIMIT).toBe(100);
    });
  });
});
