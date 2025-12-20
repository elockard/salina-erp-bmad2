/**
 * CSV Export Types Tests
 *
 * Story: 19.3 - Export Catalog to CSV
 * Task 1: Define export types and configuration
 *
 * Tests for export types, enums, and field metadata.
 */

import { describe, expect, it } from "vitest";
import {
  CONTACT_EXPORT_FIELD_METADATA,
  EXPORT_DATA_TYPES,
  EXPORTABLE_CONTACT_FIELDS,
  EXPORTABLE_SALES_FIELDS,
  EXPORTABLE_TITLE_FIELDS,
  type ExportFilters,
  type ExportResult,
  SALES_EXPORT_FIELD_METADATA,
  TITLE_EXPORT_FIELD_METADATA,
} from "@/modules/import-export/types";

describe("CSV Export Types", () => {
  describe("ExportDataType", () => {
    it("includes titles, contacts, and sales", () => {
      expect(EXPORT_DATA_TYPES).toContain("titles");
      expect(EXPORT_DATA_TYPES).toContain("contacts");
      expect(EXPORT_DATA_TYPES).toContain("sales");
    });

    it("has exactly 3 data types", () => {
      expect(EXPORT_DATA_TYPES).toHaveLength(3);
    });
  });

  describe("ExportFilters interface", () => {
    it("accepts valid date range filter", () => {
      const filters: ExportFilters = {
        dateRange: {
          from: new Date("2024-01-01"),
          to: new Date("2024-12-31"),
        },
      };
      expect(filters.dateRange?.from).toBeInstanceOf(Date);
      expect(filters.dateRange?.to).toBeInstanceOf(Date);
    });

    it("accepts publication status filter for titles", () => {
      const filters: ExportFilters = {
        publicationStatus: "published",
      };
      expect(filters.publicationStatus).toBe("published");
    });

    it("accepts format filter for sales", () => {
      const filters: ExportFilters = {
        format: "ebook",
      };
      expect(filters.format).toBe("ebook");
    });

    it("accepts channel filter for sales", () => {
      const filters: ExportFilters = {
        channel: "amazon",
      };
      expect(filters.channel).toBe("amazon");
    });

    it("accepts role filter for contacts", () => {
      const filters: ExportFilters = {
        role: "author",
      };
      expect(filters.role).toBe("author");
    });
  });

  describe("ExportResult interface", () => {
    it("tracks export status and metadata", () => {
      const result: ExportResult = {
        id: "export-123",
        status: "completed",
        exportType: "titles",
        rowCount: 100,
        fileSize: 5000,
        fileUrl: "https://s3.example.com/export.csv",
        createdAt: new Date(),
        completedAt: new Date(),
      };
      expect(result.status).toBe("completed");
      expect(result.rowCount).toBe(100);
    });

    it("includes all required status values", () => {
      const statuses: ExportResult["status"][] = [
        "pending",
        "processing",
        "completed",
        "failed",
      ];
      statuses.forEach((status) => {
        const result: ExportResult = {
          id: "test",
          status,
          exportType: "titles",
          rowCount: 0,
          createdAt: new Date(),
        };
        expect(result.status).toBe(status);
      });
    });
  });

  describe("EXPORTABLE_TITLE_FIELDS", () => {
    it("includes all required title fields", () => {
      const requiredFields = [
        "title",
        "subtitle",
        "author_name",
        "isbn",
        "genre",
        "publication_date",
        "publication_status",
        "word_count",
        "asin",
        "created_at",
        "updated_at",
      ];
      requiredFields.forEach((field) => {
        expect(EXPORTABLE_TITLE_FIELDS).toContain(field);
      });
    });
  });

  describe("EXPORTABLE_CONTACT_FIELDS", () => {
    it("includes all required contact fields", () => {
      const requiredFields = [
        "first_name",
        "last_name",
        "email",
        "phone",
        "address_line1",
        "address_line2",
        "city",
        "state",
        "postal_code",
        "country",
        "tin_last_four",
        "tin_type",
        "roles",
        "created_at",
      ];
      requiredFields.forEach((field) => {
        expect(EXPORTABLE_CONTACT_FIELDS).toContain(field);
      });
    });

    it("does NOT include tin_encrypted (security)", () => {
      expect(EXPORTABLE_CONTACT_FIELDS).not.toContain("tin_encrypted");
    });
  });

  describe("EXPORTABLE_SALES_FIELDS", () => {
    it("includes all required sales fields", () => {
      const requiredFields = [
        "title",
        "isbn",
        "author_name",
        "format",
        "channel",
        "quantity",
        "unit_price",
        "total_amount",
        "sale_date",
        "created_at",
      ];
      requiredFields.forEach((field) => {
        expect(EXPORTABLE_SALES_FIELDS).toContain(field);
      });
    });

    it("uses sale_date NOT transaction_date", () => {
      expect(EXPORTABLE_SALES_FIELDS).toContain("sale_date");
      expect(EXPORTABLE_SALES_FIELDS).not.toContain("transaction_date");
    });
  });

  describe("TITLE_EXPORT_FIELD_METADATA", () => {
    it("has metadata for all exportable title fields", () => {
      EXPORTABLE_TITLE_FIELDS.forEach((field) => {
        const meta = TITLE_EXPORT_FIELD_METADATA.find((m) => m.field === field);
        expect(meta).toBeDefined();
        expect(meta?.label).toBeDefined();
        expect(meta?.columnHeader).toBeDefined();
      });
    });
  });

  describe("CONTACT_EXPORT_FIELD_METADATA", () => {
    it("has metadata for all exportable contact fields", () => {
      EXPORTABLE_CONTACT_FIELDS.forEach((field) => {
        const meta = CONTACT_EXPORT_FIELD_METADATA.find(
          (m) => m.field === field,
        );
        expect(meta).toBeDefined();
        expect(meta?.label).toBeDefined();
        expect(meta?.columnHeader).toBeDefined();
      });
    });
  });

  describe("SALES_EXPORT_FIELD_METADATA", () => {
    it("has metadata for all exportable sales fields", () => {
      EXPORTABLE_SALES_FIELDS.forEach((field) => {
        const meta = SALES_EXPORT_FIELD_METADATA.find((m) => m.field === field);
        expect(meta).toBeDefined();
        expect(meta?.label).toBeDefined();
        expect(meta?.columnHeader).toBeDefined();
      });
    });
  });
});
