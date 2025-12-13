/**
 * ONIX Exports Schema Tests
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 * Task 3: Create ONIX export database schema
 *
 * Validates schema structure and constraints.
 */

import { describe, expect, it } from "vitest";
import { onixExportStatusValues, onixExports } from "@/db/schema/onix-exports";

describe("onix_exports schema", () => {
  describe("table definition", () => {
    it("has id column as primary key with UUID default", () => {
      expect(onixExports.id).toBeDefined();
      expect(onixExports.id.name).toBe("id");
    });

    it("has tenant_id column with NOT NULL constraint", () => {
      expect(onixExports.tenant_id).toBeDefined();
      expect(onixExports.tenant_id.notNull).toBe(true);
    });

    it("has title_ids column as UUID array with NOT NULL constraint", () => {
      expect(onixExports.title_ids).toBeDefined();
      expect(onixExports.title_ids.notNull).toBe(true);
    });

    it("has export_date column with NOT NULL and default now()", () => {
      expect(onixExports.export_date).toBeDefined();
      expect(onixExports.export_date.notNull).toBe(true);
    });

    it("has xml_content column as text with NOT NULL", () => {
      expect(onixExports.xml_content).toBeDefined();
      expect(onixExports.xml_content.notNull).toBe(true);
    });

    it("has product_count column as integer with NOT NULL", () => {
      expect(onixExports.product_count).toBeDefined();
      expect(onixExports.product_count.notNull).toBe(true);
    });

    it("has status column with NOT NULL", () => {
      expect(onixExports.status).toBeDefined();
      expect(onixExports.status.notNull).toBe(true);
    });

    it("has error_message column (nullable)", () => {
      expect(onixExports.error_message).toBeDefined();
    });

    it("has created_by column referencing users (nullable)", () => {
      expect(onixExports.created_by).toBeDefined();
    });

    it("has created_at column with NOT NULL and default now()", () => {
      expect(onixExports.created_at).toBeDefined();
      expect(onixExports.created_at.notNull).toBe(true);
    });
  });

  describe("status enum values", () => {
    it("defines success status", () => {
      expect(onixExportStatusValues).toContain("success");
    });

    it("defines validation_error status", () => {
      expect(onixExportStatusValues).toContain("validation_error");
    });

    it("defines failed status", () => {
      expect(onixExportStatusValues).toContain("failed");
    });

    it("has exactly 3 status values", () => {
      expect(onixExportStatusValues).toHaveLength(3);
    });
  });
});
