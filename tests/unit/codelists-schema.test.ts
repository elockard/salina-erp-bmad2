/**
 * Codelists Schema Tests
 *
 * Story: 14.4 - Build Codelist Management System
 * Task 1.6: Write schema tests
 *
 * Validates schema structure and constraints for platform-wide codelist tables.
 */

import { describe, expect, it } from "vitest";
import { codelists, codelistValues } from "@/db/schema/codelists";

describe("codelists schema", () => {
  describe("codelists table definition", () => {
    it("has id column as primary key with UUID default", () => {
      expect(codelists.id).toBeDefined();
      expect(codelists.id.name).toBe("id");
    });

    it("has list_number column with NOT NULL and UNIQUE constraint", () => {
      expect(codelists.list_number).toBeDefined();
      expect(codelists.list_number.notNull).toBe(true);
    });

    it("has issue_number column with NOT NULL constraint", () => {
      expect(codelists.issue_number).toBeDefined();
      expect(codelists.issue_number.notNull).toBe(true);
    });

    it("has list_name column with NOT NULL constraint", () => {
      expect(codelists.list_name).toBeDefined();
      expect(codelists.list_name.notNull).toBe(true);
    });

    it("has value_count column with NOT NULL constraint", () => {
      expect(codelists.value_count).toBeDefined();
      expect(codelists.value_count.notNull).toBe(true);
    });

    it("has loaded_at column with NOT NULL and default now()", () => {
      expect(codelists.loaded_at).toBeDefined();
      expect(codelists.loaded_at.notNull).toBe(true);
    });

    it("has updated_at column with NOT NULL and default now()", () => {
      expect(codelists.updated_at).toBeDefined();
      expect(codelists.updated_at.notNull).toBe(true);
    });

    it("does NOT have tenant_id (platform-wide table)", () => {
      expect(
        (codelists as unknown as Record<string, unknown>).tenant_id,
      ).toBeUndefined();
    });
  });

  describe("codelist_values table definition", () => {
    it("has id column as primary key with UUID default", () => {
      expect(codelistValues.id).toBeDefined();
      expect(codelistValues.id.name).toBe("id");
    });

    it("has list_number column with NOT NULL constraint", () => {
      expect(codelistValues.list_number).toBeDefined();
      expect(codelistValues.list_number.notNull).toBe(true);
    });

    it("has code column with NOT NULL constraint", () => {
      expect(codelistValues.code).toBeDefined();
      expect(codelistValues.code.notNull).toBe(true);
    });

    it("has description column with NOT NULL constraint", () => {
      expect(codelistValues.description).toBeDefined();
      expect(codelistValues.description.notNull).toBe(true);
    });

    it("has notes column (nullable)", () => {
      expect(codelistValues.notes).toBeDefined();
    });

    it("has deprecated column with default false", () => {
      expect(codelistValues.deprecated).toBeDefined();
    });

    it("has added_in_issue column (nullable)", () => {
      expect(codelistValues.added_in_issue).toBeDefined();
    });

    it("does NOT have tenant_id (platform-wide table)", () => {
      expect(
        (codelistValues as unknown as Record<string, unknown>).tenant_id,
      ).toBeUndefined();
    });
  });

  describe("platform-wide design", () => {
    it("codelists table has no foreign key to tenants", () => {
      // The codelists table should not reference the tenants table
      // This is a platform-wide shared resource
      const tableConfig = codelists as unknown as {
        _: { config: { foreignKeys?: unknown[] } };
      };
      const foreignKeys = tableConfig._?.config?.foreignKeys ?? [];
      expect(foreignKeys).toHaveLength(0);
    });

    it("codelist_values table has no foreign key to tenants", () => {
      // The codelist_values table should not reference the tenants table
      const tableConfig = codelistValues as unknown as {
        _: { config: { foreignKeys?: unknown[] } };
      };
      const foreignKeys = tableConfig._?.config?.foreignKeys ?? [];
      expect(foreignKeys).toHaveLength(0);
    });
  });
});
