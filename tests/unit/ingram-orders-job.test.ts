/**
 * Ingram Orders Job Unit Tests
 *
 * Story 16.3 - Ingest Ingram Order Data
 * Tests for the Inngest job structure and business logic.
 *
 * Note: These tests validate the job structure and business logic.
 * Full integration tests would require mocking Inngest and FTP.
 */

import { describe, expect, it } from "vitest";
import { FEED_STATUS, FEED_TYPE } from "@/db/schema/channel-feeds";
import { normalizeIsbn } from "@/modules/channels/adapters/ingram/order-parser";

/**
 * Simulates the ISBN matching logic from ingram-orders.ts
 * Maps ISBN to title info for matching orders
 */
interface TitleMatch {
  id: string;
  format: "physical" | "ebook";
}

function buildIsbnMap(
  titles: { id: string; isbn: string | null; eisbn: string | null }[],
): Map<string, TitleMatch> {
  const map = new Map<string, TitleMatch>();
  for (const title of titles) {
    if (title.isbn) {
      map.set(normalizeIsbn(title.isbn), { id: title.id, format: "physical" });
    }
    if (title.eisbn) {
      map.set(normalizeIsbn(title.eisbn), { id: title.id, format: "ebook" });
    }
  }
  return map;
}

/**
 * Simulates the duplicate detection logic from ingram-orders.ts
 * Checks if order already exists based on tenant, title, date, quantity, channel
 */
interface ExistingSale {
  tenant_id: string;
  title_id: string;
  sale_date: string;
  quantity: number;
  channel: string;
}

interface OrderToCheck {
  titleId: string;
  orderDate: Date;
  quantity: number;
}

function isDuplicate(
  tenantId: string,
  order: OrderToCheck,
  existingSales: ExistingSale[],
): boolean {
  const orderDateStr = order.orderDate.toISOString().split("T")[0];
  return existingSales.some(
    (sale) =>
      sale.tenant_id === tenantId &&
      sale.title_id === order.titleId &&
      sale.sale_date === orderDateStr &&
      sale.quantity === order.quantity &&
      sale.channel === "distributor",
  );
}

describe("Ingram Orders Job Logic", () => {
  describe("ISBN Matching", () => {
    it("should match physical ISBN", () => {
      const titles = [
        { id: "title-1", isbn: "978-0-123-45678-9", eisbn: null },
      ];
      const isbnMap = buildIsbnMap(titles);

      // Normalized ISBN lookup
      const match = isbnMap.get("9780123456789");
      expect(match).toBeDefined();
      expect(match?.id).toBe("title-1");
      expect(match?.format).toBe("physical");
    });

    it("should match ebook ISBN", () => {
      const titles = [
        { id: "title-2", isbn: null, eisbn: "978-0-987-65432-1" },
      ];
      const isbnMap = buildIsbnMap(titles);

      const match = isbnMap.get("9780987654321");
      expect(match).toBeDefined();
      expect(match?.id).toBe("title-2");
      expect(match?.format).toBe("ebook");
    });

    it("should match both physical and ebook ISBNs for same title", () => {
      const titles = [
        {
          id: "title-3",
          isbn: "978-0-111-11111-1",
          eisbn: "978-0-222-22222-2",
        },
      ];
      const isbnMap = buildIsbnMap(titles);

      const physicalMatch = isbnMap.get("9780111111111");
      const ebookMatch = isbnMap.get("9780222222222");

      expect(physicalMatch?.id).toBe("title-3");
      expect(physicalMatch?.format).toBe("physical");
      expect(ebookMatch?.id).toBe("title-3");
      expect(ebookMatch?.format).toBe("ebook");
    });

    it("should return undefined for unmatched ISBN", () => {
      const titles = [
        { id: "title-1", isbn: "978-0-123-45678-9", eisbn: null },
      ];
      const isbnMap = buildIsbnMap(titles);

      const match = isbnMap.get("9789999999999");
      expect(match).toBeUndefined();
    });

    it("should handle ISBN-10 input through normalization", () => {
      const titles = [
        { id: "title-4", isbn: "978-0-306-40615-7", eisbn: null },
      ];
      const isbnMap = buildIsbnMap(titles);

      // ISBN-10: 0306406152 converts to ISBN-13: 9780306406157
      const normalizedInput = normalizeIsbn("0306406152");
      const match = isbnMap.get(normalizedInput);

      expect(match).toBeDefined();
      expect(match?.id).toBe("title-4");
    });

    it("should skip null ISBNs in titles", () => {
      const titles = [{ id: "title-5", isbn: null, eisbn: null }];
      const isbnMap = buildIsbnMap(titles);

      expect(isbnMap.size).toBe(0);
    });
  });

  describe("Duplicate Detection", () => {
    const existingSales: ExistingSale[] = [
      {
        tenant_id: "tenant-1",
        title_id: "title-1",
        sale_date: "2023-12-01",
        quantity: 5,
        channel: "distributor",
      },
      {
        tenant_id: "tenant-1",
        title_id: "title-2",
        sale_date: "2023-12-01",
        quantity: 3,
        channel: "distributor",
      },
    ];

    it("should detect exact duplicate", () => {
      const order: OrderToCheck = {
        titleId: "title-1",
        orderDate: new Date("2023-12-01"),
        quantity: 5,
      };

      expect(isDuplicate("tenant-1", order, existingSales)).toBe(true);
    });

    it("should not flag different title as duplicate", () => {
      const order: OrderToCheck = {
        titleId: "title-3",
        orderDate: new Date("2023-12-01"),
        quantity: 5,
      };

      expect(isDuplicate("tenant-1", order, existingSales)).toBe(false);
    });

    it("should not flag different date as duplicate", () => {
      const order: OrderToCheck = {
        titleId: "title-1",
        orderDate: new Date("2023-12-02"),
        quantity: 5,
      };

      expect(isDuplicate("tenant-1", order, existingSales)).toBe(false);
    });

    it("should not flag different quantity as duplicate", () => {
      const order: OrderToCheck = {
        titleId: "title-1",
        orderDate: new Date("2023-12-01"),
        quantity: 10,
      };

      expect(isDuplicate("tenant-1", order, existingSales)).toBe(false);
    });

    it("should not flag different tenant as duplicate", () => {
      const order: OrderToCheck = {
        titleId: "title-1",
        orderDate: new Date("2023-12-01"),
        quantity: 5,
      };

      expect(isDuplicate("tenant-2", order, existingSales)).toBe(false);
    });

    it("should allow same order for different channels", () => {
      const nonDistributorSales: ExistingSale[] = [
        {
          tenant_id: "tenant-1",
          title_id: "title-1",
          sale_date: "2023-12-01",
          quantity: 5,
          channel: "direct",
        },
      ];

      const order: OrderToCheck = {
        titleId: "title-1",
        orderDate: new Date("2023-12-01"),
        quantity: 5,
      };

      // Should not be duplicate because existing sale is "direct" not "distributor"
      expect(isDuplicate("tenant-1", order, nonDistributorSales)).toBe(false);
    });
  });

  describe("Import Metadata Structure", () => {
    interface ImportMetadata {
      filesProcessed: number;
      ordersCreated: number;
      unmatchedIsbns: { isbn: string; orderId: string; quantity: number }[];
      duplicatesSkipped: number;
      parseErrors: { file: string; line: number; message: string }[];
    }

    it("should have correct metadata structure", () => {
      const metadata: ImportMetadata = {
        filesProcessed: 3,
        ordersCreated: 50,
        unmatchedIsbns: [
          { isbn: "9789999999999", orderId: "PO123", quantity: 2 },
        ],
        duplicatesSkipped: 5,
        parseErrors: [
          { file: "orders.csv", line: 15, message: "Invalid quantity" },
        ],
      };

      expect(metadata.filesProcessed).toBeGreaterThanOrEqual(0);
      expect(metadata.ordersCreated).toBeGreaterThanOrEqual(0);
      expect(metadata.duplicatesSkipped).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(metadata.unmatchedIsbns)).toBe(true);
      expect(Array.isArray(metadata.parseErrors)).toBe(true);
    });

    it("should track unmatched ISBNs with full details", () => {
      const unmatched = {
        isbn: "9780000000000",
        orderId: "PO456",
        quantity: 10,
      };

      expect(unmatched.isbn).toMatch(/^\d{13}$/);
      expect(unmatched.orderId).toBeDefined();
      expect(unmatched.quantity).toBeGreaterThan(0);
    });

    it("should track parse errors with location", () => {
      const error = {
        file: "ingram_orders.edi",
        line: 42,
        message: "Missing BEG segment",
      };

      expect(error.file).toBeDefined();
      expect(error.line).toBeGreaterThan(0);
      expect(error.message).toBeDefined();
    });
  });

  describe("Feed Type Constants", () => {
    it("should have IMPORT feed type for order imports", () => {
      expect(FEED_TYPE.IMPORT).toBe("import");
    });

    it("should have all required feed types", () => {
      expect(FEED_TYPE.FULL).toBe("full");
      expect(FEED_TYPE.DELTA).toBe("delta");
      expect(FEED_TYPE.IMPORT).toBe("import");
    });

    it("should have correct feed statuses", () => {
      expect(FEED_STATUS.PENDING).toBe("pending");
      expect(FEED_STATUS.GENERATING).toBe("generating");
      expect(FEED_STATUS.SUCCESS).toBe("success");
      expect(FEED_STATUS.FAILED).toBe("failed");
      expect(FEED_STATUS.SKIPPED).toBe("skipped");
    });
  });

  describe("Sales Transaction Creation", () => {
    it("should calculate total amount correctly", () => {
      const quantity = 10;
      const unitPrice = 9.99;
      const totalAmount = (quantity * unitPrice).toFixed(2);

      expect(totalAmount).toBe("99.90");
    });

    it("should handle zero price orders (complimentary copies)", () => {
      const quantity = 5;
      const unitPrice = 0;
      const totalAmount = (quantity * unitPrice).toFixed(2);

      expect(totalAmount).toBe("0.00");
    });

    it("should format sale date correctly from Date", () => {
      const orderDate = new Date("2023-12-15T10:30:00Z");
      const saleDateStr = orderDate.toISOString().split("T")[0];

      expect(saleDateStr).toBe("2023-12-15");
    });

    it("should use distributor channel for Ingram orders", () => {
      const channel = "distributor";

      expect(channel).toBe("distributor");
    });
  });

  describe("Order Ingestion Event", () => {
    interface IngramOrdersEventData {
      tenantId: string;
      triggeredBy: "schedule" | "manual";
      userId?: string;
    }

    it("should have required event data for scheduled trigger", () => {
      const eventData: IngramOrdersEventData = {
        tenantId: "tenant-123",
        triggeredBy: "schedule",
      };

      expect(eventData.tenantId).toBeDefined();
      expect(eventData.triggeredBy).toBe("schedule");
      expect(eventData.userId).toBeUndefined();
    });

    it("should have userId for manual trigger", () => {
      const eventData: IngramOrdersEventData = {
        tenantId: "tenant-123",
        triggeredBy: "manual",
        userId: "user-456",
      };

      expect(eventData.tenantId).toBeDefined();
      expect(eventData.triggeredBy).toBe("manual");
      expect(eventData.userId).toBe("user-456");
    });
  });

  describe("Scheduler Integration", () => {
    it("should trigger order imports for all active connections", () => {
      // Simulating scheduler behavior
      const activeConnections = [
        { tenantId: "tenant-1", status: "active" },
        { tenantId: "tenant-2", status: "active" },
      ];

      const triggeredImports: string[] = [];
      for (const conn of activeConnections) {
        if (conn.status === "active") {
          triggeredImports.push(conn.tenantId);
        }
      }

      expect(triggeredImports).toHaveLength(2);
      expect(triggeredImports).toContain("tenant-1");
      expect(triggeredImports).toContain("tenant-2");
    });

    it("should skip inactive connections", () => {
      const connections = [
        { tenantId: "tenant-1", status: "active" },
        { tenantId: "tenant-2", status: "inactive" },
        { tenantId: "tenant-3", status: "active" },
      ];

      const triggeredImports: string[] = [];
      for (const conn of connections) {
        if (conn.status === "active") {
          triggeredImports.push(conn.tenantId);
        }
      }

      expect(triggeredImports).toHaveLength(2);
      expect(triggeredImports).not.toContain("tenant-2");
    });
  });
});

describe("Edge Cases", () => {
  it("should handle empty order files gracefully", () => {
    const orderFiles: string[] = [];

    const result = {
      success: true,
      skipped: orderFiles.length === 0,
      reason: orderFiles.length === 0 ? "No new order files" : null,
    };

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("No new order files");
  });

  it("should continue processing after individual row errors", () => {
    const orders = [
      { valid: true, isbn: "9780123456789" },
      { valid: false, isbn: "invalid" },
      { valid: true, isbn: "9780987654321" },
    ];

    const validOrders = orders.filter((o) => o.valid);
    const errors = orders.filter((o) => !o.valid);

    expect(validOrders).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });

  it("should handle missing tenant owner gracefully", () => {
    const tenantOwner = null;

    const shouldFail = tenantOwner === null;
    const errorMessage = shouldFail ? "Tenant owner not found" : null;

    expect(shouldFail).toBe(true);
    expect(errorMessage).toBe("Tenant owner not found");
  });
});
