/**
 * CSV Exporter Unit Tests
 *
 * Story: 19.3 - Export Catalog to CSV
 * Task 8: Write tests
 *
 * Tests for CSV export generators:
 * - UTF-8 BOM for Excel compatibility
 * - Timestamp header row
 * - Field formatting and escaping
 * - Date range filtering
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock adminDb
vi.mock("@/db", () => ({
  adminDb: {
    query: {
      titles: {
        findMany: vi.fn(),
      },
      contacts: {
        findMany: vi.fn(),
      },
      sales: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  },
}));

describe("CSV Exporter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:30:45Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("generateTitlesCsv", () => {
    it("includes UTF-8 BOM for Excel compatibility", async () => {
      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.titles.findMany).mockResolvedValue([]);

      const { generateTitlesCsv } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const csv = await generateTitlesCsv("test-tenant-id");

      // UTF-8 BOM is U+FEFF (0xFEFF)
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it("includes timestamp header row", async () => {
      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.titles.findMany).mockResolvedValue([]);

      const { generateTitlesCsv } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const csv = await generateTitlesCsv("test-tenant-id");

      expect(csv).toContain("Salina ERP Export - Titles - Generated:");
      expect(csv).toContain("2024-01-15");
    });

    it("includes all exportable title fields as headers", async () => {
      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.titles.findMany).mockResolvedValue([]);

      const { generateTitlesCsv } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const csv = await generateTitlesCsv("test-tenant-id");

      // Check for expected column headers
      expect(csv).toContain("Title");
      expect(csv).toContain("Subtitle");
      expect(csv).toContain("Author");
      expect(csv).toContain("ISBN");
      expect(csv).toContain("Genre");
      expect(csv).toContain("Publication Date");
      expect(csv).toContain("Status");
      expect(csv).toContain("Word Count");
      expect(csv).toContain("ASIN");
      expect(csv).toContain("Created");
      expect(csv).toContain("Updated");
    });

    it("formats title data correctly", async () => {
      const { adminDb } = await import("@/db");
      const mockTitle = {
        id: "title-1",
        title: "The Great Gatsby",
        subtitle: "A Novel",
        isbn: "978-0-7432-7356-5",
        genre: "Fiction",
        publication_date: "2024-01-15",
        publication_status: "published",
        word_count: 47094,
        asin: "B08N5WRWNW",
        created_at: new Date("2024-01-01T00:00:00Z"),
        updated_at: new Date("2024-01-15T00:00:00Z"),
        contact: {
          first_name: "F. Scott",
          last_name: "Fitzgerald",
        },
        titleAuthors: [],
      };

      vi.mocked(adminDb.query.titles.findMany).mockResolvedValue([
        mockTitle,
      ] as never);

      const { generateTitlesCsv } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const csv = await generateTitlesCsv("test-tenant-id");

      expect(csv).toContain("The Great Gatsby");
      expect(csv).toContain("A Novel");
      expect(csv).toContain("F. Scott Fitzgerald");
      expect(csv).toContain("978-0-7432-7356-5");
      expect(csv).toContain("Fiction");
      expect(csv).toContain("published");
      expect(csv).toContain("47094");
      expect(csv).toContain("B08N5WRWNW");
    });

    it("escapes special characters in field values", async () => {
      const { adminDb } = await import("@/db");
      const mockTitle = {
        id: "title-1",
        title: 'Book, Part 1: "The Beginning"',
        subtitle: null,
        isbn: null,
        genre: null,
        publication_date: null,
        publication_status: "draft",
        word_count: null,
        asin: null,
        created_at: new Date("2024-01-01T00:00:00Z"),
        updated_at: new Date("2024-01-15T00:00:00Z"),
        contact: null,
        titleAuthors: [],
      };

      vi.mocked(adminDb.query.titles.findMany).mockResolvedValue([
        mockTitle,
      ] as never);

      const { generateTitlesCsv } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const csv = await generateTitlesCsv("test-tenant-id");

      // Quotes should be escaped by doubling them
      expect(csv).toContain('"Book, Part 1: ""The Beginning"""');
    });

    it("handles null/undefined fields gracefully", async () => {
      const { adminDb } = await import("@/db");
      const mockTitle = {
        id: "title-1",
        title: "Test Title",
        subtitle: null,
        isbn: null,
        genre: null,
        publication_date: null,
        publication_status: "draft",
        word_count: null,
        asin: null,
        created_at: new Date("2024-01-01T00:00:00Z"),
        updated_at: new Date("2024-01-15T00:00:00Z"),
        contact: null,
        titleAuthors: [],
      };

      vi.mocked(adminDb.query.titles.findMany).mockResolvedValue([
        mockTitle,
      ] as never);

      const { generateTitlesCsv } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const csv = await generateTitlesCsv("test-tenant-id");

      // Should not throw and should have empty fields
      expect(csv).toContain("Test Title");
      // Check data row exists with empty fields
      const lines = csv.split("\n");
      const dataLine = lines.find((l) => l.includes("Test Title"));
      expect(dataLine).toBeDefined();
    });
  });

  describe("generateContactsCsv", () => {
    it("exports tin_last_four directly (already masked)", async () => {
      const { adminDb } = await import("@/db");
      const mockContact = {
        id: "contact-1",
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        phone: "555-1234",
        address_line1: "123 Main St",
        address_line2: null,
        city: "Anytown",
        state: "CA",
        postal_code: "12345",
        country: "USA",
        tin_last_four: "6789",
        tin_type: "ssn",
        created_at: new Date("2024-01-01T00:00:00Z"),
        roles: [{ role: "author" }],
      };

      vi.mocked(adminDb.query.contacts.findMany).mockResolvedValue([
        mockContact,
      ] as never);

      const { generateContactsCsv } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const csv = await generateContactsCsv("test-tenant-id");

      expect(csv).toContain("6789");
      expect(csv).toContain("ssn");
    });

    it("includes all contact fields", async () => {
      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.contacts.findMany).mockResolvedValue([]);

      const { generateContactsCsv } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const csv = await generateContactsCsv("test-tenant-id");

      // Check for expected column headers
      expect(csv).toContain("First Name");
      expect(csv).toContain("Last Name");
      expect(csv).toContain("Email");
      expect(csv).toContain("Phone");
      expect(csv).toContain("Address Line 1");
      expect(csv).toContain("City");
      expect(csv).toContain("State");
      expect(csv).toContain("Postal Code");
      expect(csv).toContain("Country");
      expect(csv).toContain("Tax ID (Last 4)");
      expect(csv).toContain("TIN Type");
      expect(csv).toContain("Roles");
    });

    it("formats roles as comma-separated list", async () => {
      const { adminDb } = await import("@/db");
      const mockContact = {
        id: "contact-1",
        first_name: "Jane",
        last_name: "Smith",
        email: "jane@example.com",
        phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        postal_code: null,
        country: null,
        tin_last_four: null,
        tin_type: null,
        created_at: new Date("2024-01-01T00:00:00Z"),
        roles: [{ role: "author" }, { role: "vendor" }],
      };

      vi.mocked(adminDb.query.contacts.findMany).mockResolvedValue([
        mockContact,
      ] as never);

      const { generateContactsCsv } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const csv = await generateContactsCsv("test-tenant-id");

      // Roles should be comma-separated
      expect(csv).toContain("author, vendor");
    });
  });

  describe("generateSalesCsv", () => {
    it("includes all sales fields", async () => {
      const { adminDb } = await import("@/db");
      // Mock the chained query
      vi.mocked(adminDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof adminDb.select>);

      const { generateSalesCsv } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const csv = await generateSalesCsv("test-tenant-id");

      // Check for expected column headers
      expect(csv).toContain("Title");
      expect(csv).toContain("ISBN");
      expect(csv).toContain("Author");
      expect(csv).toContain("Format");
      expect(csv).toContain("Channel");
      expect(csv).toContain("Quantity");
      expect(csv).toContain("Unit Price");
      expect(csv).toContain("Total");
      expect(csv).toContain("Sale Date");
    });

    it("includes format and channel in export", async () => {
      const { adminDb } = await import("@/db");
      const mockSale = {
        id: "sale-1",
        sale_date: "2024-01-15",
        format: "ebook",
        quantity: 5,
        unit_price: "9.99",
        total_amount: "49.95",
        channel: "amazon",
        created_at: new Date("2024-01-15T00:00:00Z"),
        title_name: "Test Book",
        title_isbn: "978-1234567890",
        author_first_name: "John",
        author_last_name: "Author",
      };

      vi.mocked(adminDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([mockSale]),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof adminDb.select>);

      const { generateSalesCsv } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const csv = await generateSalesCsv("test-tenant-id");

      expect(csv).toContain("ebook");
      expect(csv).toContain("amazon");
      expect(csv).toContain("Test Book");
      expect(csv).toContain("John Author");
    });
  });

  describe("Export counts", () => {
    it("getTitlesExportCount returns correct count", async () => {
      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.titles.findMany).mockResolvedValue([
        { id: "1" },
        { id: "2" },
        { id: "3" },
      ] as never);

      const { getTitlesExportCount } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const count = await getTitlesExportCount("test-tenant-id");

      expect(count).toBe(3);
    });

    it("getContactsExportCount returns correct count", async () => {
      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.contacts.findMany).mockResolvedValue([
        { id: "1", roles: [{ role: "author" }] },
        { id: "2", roles: [{ role: "vendor" }] },
      ] as never);

      const { getContactsExportCount } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const count = await getContactsExportCount("test-tenant-id");

      expect(count).toBe(2);
    });

    it("getContactsExportCount filters by role", async () => {
      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.contacts.findMany).mockResolvedValue([
        { id: "1", roles: [{ role: "author" }] },
        { id: "2", roles: [{ role: "vendor" }] },
        { id: "3", roles: [{ role: "author" }] },
      ] as never);

      const { getContactsExportCount } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const count = await getContactsExportCount("test-tenant-id", {
        role: "author",
      });

      expect(count).toBe(2);
    });

    it("getSalesExportCount returns correct count", async () => {
      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.sales.findMany).mockResolvedValue([
        { id: "1" },
        { id: "2" },
      ] as never);

      const { getSalesExportCount } = await import(
        "@/modules/import-export/exporters/csv-exporter"
      );

      const count = await getSalesExportCount("test-tenant-id");

      expect(count).toBe(2);
    });
  });
});
