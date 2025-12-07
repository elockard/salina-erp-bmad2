/**
 * ISBN Prefixes Schema Unit Tests
 *
 * Tests for the isbn_prefixes table schema definition.
 * Story 7.4: Implement Publisher ISBN Prefix System
 * AC: 7.4.1 - ISBN Prefix Schema
 */

import { describe, expect, test } from "vitest";
import {
  isbnPrefixes,
  isbnPrefixBlockSizes,
  isbnPrefixGenerationStatusValues,
  type IsbnPrefixBlockSize,
  type IsbnPrefixGenerationStatus,
} from "@/db/schema/isbn-prefixes";
import { getTableColumns, getTableName } from "drizzle-orm";

describe("ISBN Prefixes Schema", () => {
  describe("Table Definition", () => {
    test("table name is isbn_prefixes", () => {
      expect(getTableName(isbnPrefixes)).toBe("isbn_prefixes");
    });

    test("has all required columns", () => {
      const columns = getTableColumns(isbnPrefixes);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("tenant_id");
      expect(columnNames).toContain("prefix");
      expect(columnNames).toContain("block_size");
      expect(columnNames).toContain("type");
      expect(columnNames).toContain("description");
      expect(columnNames).toContain("total_isbns");
      expect(columnNames).toContain("available_count");
      expect(columnNames).toContain("assigned_count");
      expect(columnNames).toContain("generation_status");
      expect(columnNames).toContain("generation_error");
      expect(columnNames).toContain("created_by_user_id");
      expect(columnNames).toContain("created_at");
      expect(columnNames).toContain("updated_at");
    });

    test("id column is UUID primary key with default random", () => {
      const columns = getTableColumns(isbnPrefixes);
      const idColumn = columns.id;

      // UUID columns are represented as 'string' dataType in Drizzle
      expect(idColumn.dataType).toBe("string");
      expect(idColumn.columnType).toBe("PgUUID");
      expect(idColumn.primary).toBe(true);
      expect(idColumn.hasDefault).toBe(true);
    });

    test("tenant_id column is NOT NULL UUID", () => {
      const columns = getTableColumns(isbnPrefixes);
      const tenantIdColumn = columns.tenant_id;

      // UUID columns are represented as 'string' dataType in Drizzle
      expect(tenantIdColumn.dataType).toBe("string");
      expect(tenantIdColumn.columnType).toBe("PgUUID");
      expect(tenantIdColumn.notNull).toBe(true);
    });

    test("prefix column is NOT NULL text", () => {
      const columns = getTableColumns(isbnPrefixes);
      const prefixColumn = columns.prefix;

      expect(prefixColumn.dataType).toBe("string");
      expect(prefixColumn.notNull).toBe(true);
    });

    test("block_size column is NOT NULL integer", () => {
      const columns = getTableColumns(isbnPrefixes);
      const blockSizeColumn = columns.block_size;

      expect(blockSizeColumn.dataType).toBe("number");
      expect(blockSizeColumn.notNull).toBe(true);
    });

    // Story 7.6: Type column is now nullable (deprecated)
    test("type column has physical/ebook enum values (nullable)", () => {
      const columns = getTableColumns(isbnPrefixes);
      const typeColumn = columns.type;

      expect(typeColumn.dataType).toBe("string");
      // Story 7.6: Type is now nullable - field deprecated
      expect(typeColumn.notNull).toBe(false);
      expect(typeColumn.enumValues).toEqual(["physical", "ebook"]);
    });

    test("generation_status column has correct enum values", () => {
      const columns = getTableColumns(isbnPrefixes);
      const statusColumn = columns.generation_status;

      expect(statusColumn.dataType).toBe("string");
      expect(statusColumn.notNull).toBe(true);
      expect(statusColumn.enumValues).toEqual([
        "pending",
        "generating",
        "completed",
        "failed",
      ]);
    });

    test("description column is nullable text", () => {
      const columns = getTableColumns(isbnPrefixes);
      const descColumn = columns.description;

      expect(descColumn.dataType).toBe("string");
      expect(descColumn.notNull).toBe(false);
    });

    test("generation_error column is nullable text", () => {
      const columns = getTableColumns(isbnPrefixes);
      const errorColumn = columns.generation_error;

      expect(errorColumn.dataType).toBe("string");
      expect(errorColumn.notNull).toBe(false);
    });

    test("timestamps have defaults", () => {
      const columns = getTableColumns(isbnPrefixes);

      expect(columns.created_at.hasDefault).toBe(true);
      expect(columns.updated_at.hasDefault).toBe(true);
    });
  });

  describe("Type Exports", () => {
    test("isbnPrefixBlockSizes contains valid block sizes", () => {
      expect(isbnPrefixBlockSizes).toEqual([
        10, 100, 1000, 10000, 100000, 1000000,
      ]);
    });

    test("isbnPrefixGenerationStatusValues contains valid statuses", () => {
      expect(isbnPrefixGenerationStatusValues).toEqual([
        "pending",
        "generating",
        "completed",
        "failed",
      ]);
    });

    test("IsbnPrefixBlockSize type accepts valid values", () => {
      const validSizes: IsbnPrefixBlockSize[] = [
        10, 100, 1000, 10000, 100000, 1000000,
      ];
      expect(validSizes).toHaveLength(6);
    });

    test("IsbnPrefixGenerationStatus type accepts valid values", () => {
      const validStatuses: IsbnPrefixGenerationStatus[] = [
        "pending",
        "generating",
        "completed",
        "failed",
      ];
      expect(validStatuses).toHaveLength(4);
    });
  });
});
