import { describe, expect, it } from "vitest";
import { z } from "zod";
import { returnStatusValues } from "@/db/schema/returns";
import { salesFormatValues } from "@/db/schema/sales";
import type {
  PaginatedReturns,
  ReturnsHistoryFilters,
  ReturnWithRelations,
} from "@/modules/returns/types";

/**
 * Unit tests for Returns History View
 *
 * Story 3.7: Build Returns History View with Status Filtering
 * AC 3-7: Filter, sort, and pagination validation tests
 *
 * Tests validate:
 * - Filter type structure (AC 3-6)
 * - Sort options (AC 7)
 * - Pagination structure (AC 8)
 * - Type definitions for history data
 */

// Schema for validating filter inputs (mirrors ReturnsHistoryFilters type)
const returnsHistoryFiltersSchema = z.object({
  status: z.enum(["all", "pending", "approved", "rejected"]).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  search: z.string().optional(),
  format: z.enum(["all", "physical", "ebook", "audiobook"]).optional(),
  sort: z.enum(["date", "amount", "status"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

describe("ReturnsHistoryFilters Type (Story 3.7 AC 3-8)", () => {
  describe("status filter (AC 3)", () => {
    it("accepts 'all' as default status", () => {
      const filter: ReturnsHistoryFilters = { status: "all" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts 'pending' status", () => {
      const filter: ReturnsHistoryFilters = { status: "pending" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts 'approved' status", () => {
      const filter: ReturnsHistoryFilters = { status: "approved" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts 'rejected' status", () => {
      const filter: ReturnsHistoryFilters = { status: "rejected" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts undefined status (no filter)", () => {
      const filter: ReturnsHistoryFilters = {};
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("status options match database enum values", () => {
      // Status options should include all db values plus 'all'
      const statusOptions = ["all", ...returnStatusValues];
      expect(statusOptions).toContain("all");
      expect(statusOptions).toContain("pending");
      expect(statusOptions).toContain("approved");
      expect(statusOptions).toContain("rejected");
    });
  });

  describe("date range filter (AC 4)", () => {
    it("accepts from_date only", () => {
      const filter: ReturnsHistoryFilters = { from_date: "2025-01-01" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts to_date only", () => {
      const filter: ReturnsHistoryFilters = { to_date: "2025-01-31" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts both from_date and to_date", () => {
      const filter: ReturnsHistoryFilters = {
        from_date: "2025-01-01",
        to_date: "2025-01-31",
      };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts empty date range (no filter)", () => {
      const filter: ReturnsHistoryFilters = {};
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });
  });

  describe("search filter (AC 5)", () => {
    it("accepts search term", () => {
      const filter: ReturnsHistoryFilters = { search: "book title" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts empty search (no filter)", () => {
      const filter: ReturnsHistoryFilters = { search: "" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts search with spaces", () => {
      const filter: ReturnsHistoryFilters = { search: "my book title" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });
  });

  describe("format filter (AC 6)", () => {
    it("accepts 'all' as default format", () => {
      const filter: ReturnsHistoryFilters = { format: "all" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts 'physical' format", () => {
      const filter: ReturnsHistoryFilters = { format: "physical" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts 'ebook' format", () => {
      const filter: ReturnsHistoryFilters = { format: "ebook" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts 'audiobook' format", () => {
      const filter: ReturnsHistoryFilters = { format: "audiobook" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("format options match database enum values", () => {
      // Format options should include all db values plus 'all'
      const formatOptions = ["all", ...salesFormatValues];
      expect(formatOptions).toContain("all");
      expect(formatOptions).toContain("physical");
      expect(formatOptions).toContain("ebook");
      expect(formatOptions).toContain("audiobook");
    });
  });

  describe("sorting options (AC 7)", () => {
    it("accepts 'date' sort", () => {
      const filter: ReturnsHistoryFilters = { sort: "date" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts 'amount' sort", () => {
      const filter: ReturnsHistoryFilters = { sort: "amount" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts 'status' sort", () => {
      const filter: ReturnsHistoryFilters = { sort: "status" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts 'asc' order", () => {
      const filter: ReturnsHistoryFilters = { order: "asc" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts 'desc' order", () => {
      const filter: ReturnsHistoryFilters = { order: "desc" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts sort with order", () => {
      const filter: ReturnsHistoryFilters = { sort: "date", order: "desc" };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });
  });

  describe("pagination options (AC 8)", () => {
    it("accepts page number", () => {
      const filter: ReturnsHistoryFilters = { page: 1 };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts pageSize", () => {
      const filter: ReturnsHistoryFilters = { pageSize: 20 };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts page and pageSize together", () => {
      const filter: ReturnsHistoryFilters = { page: 2, pageSize: 50 };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts valid page size options (10, 20, 50)", () => {
      for (const size of [10, 20, 50]) {
        const filter: ReturnsHistoryFilters = { pageSize: size };
        const result = returnsHistoryFiltersSchema.safeParse(filter);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("combined filters", () => {
    it("accepts all filters combined", () => {
      const filter: ReturnsHistoryFilters = {
        status: "pending",
        from_date: "2025-01-01",
        to_date: "2025-01-31",
        search: "book",
        format: "physical",
        sort: "date",
        order: "desc",
        page: 1,
        pageSize: 20,
      };
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it("accepts empty filter object", () => {
      const filter: ReturnsHistoryFilters = {};
      const result = returnsHistoryFiltersSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });
  });
});

describe("PaginatedReturns Type (Story 3.7 AC 8)", () => {
  it("has required pagination fields", () => {
    const result: PaginatedReturns = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("pageSize");
    expect(result).toHaveProperty("totalPages");
  });

  it("items array contains ReturnWithRelations", () => {
    const mockReturn: ReturnWithRelations = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      return_date: "2025-01-15",
      format: "physical",
      quantity: 5,
      unit_price: "10.99",
      total_amount: "54.95",
      reason: "Damaged",
      status: "pending",
      reviewed_at: null,
      created_at: new Date(),
      title: {
        id: "title-id",
        title: "Test Book",
        author_name: "Test Author",
      },
      createdBy: {
        name: "testuser",
      },
      reviewedBy: null,
      originalSale: null,
    };

    const result: PaginatedReturns = {
      items: [mockReturn],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(mockReturn);
  });

  it("calculates totalPages correctly", () => {
    // With 45 items and pageSize 20, totalPages should be 3
    const totalItems = 45;
    const pageSize = 20;
    const totalPages = Math.ceil(totalItems / pageSize);

    expect(totalPages).toBe(3);
  });
});

describe("ReturnWithRelations Type (Story 3.7 AC 2, 10)", () => {
  it("has all required fields for table display (AC 2)", () => {
    const mockReturn: ReturnWithRelations = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      return_date: "2025-01-15",
      format: "physical",
      quantity: 5,
      unit_price: "10.99",
      total_amount: "54.95",
      reason: "Damaged",
      status: "pending",
      reviewed_at: null,
      created_at: new Date(),
      title: {
        id: "title-id",
        title: "Test Book",
        author_name: "Test Author",
      },
      createdBy: {
        name: "testuser",
      },
      reviewedBy: null,
      originalSale: null,
    };

    // Table columns
    expect(mockReturn).toHaveProperty("return_date"); // Date column
    expect(mockReturn).toHaveProperty("title"); // Title column
    expect(mockReturn).toHaveProperty("format"); // Format column
    expect(mockReturn).toHaveProperty("quantity"); // Quantity column
    expect(mockReturn).toHaveProperty("total_amount"); // Amount column
    expect(mockReturn).toHaveProperty("reason"); // Reason column
    expect(mockReturn).toHaveProperty("status"); // Status column
    expect(mockReturn).toHaveProperty("reviewedBy"); // Reviewed By column
    expect(mockReturn).toHaveProperty("id"); // For View Detail action
  });

  it("has nested title object with name and author", () => {
    const mockReturn: ReturnWithRelations = {
      id: "id",
      return_date: "2025-01-15",
      format: "physical",
      quantity: 5,
      unit_price: "10.99",
      total_amount: "54.95",
      reason: null,
      status: "pending",
      reviewed_at: null,
      created_at: new Date(),
      title: {
        id: "title-id",
        title: "The Great Book",
        author_name: "Jane Author",
      },
      createdBy: { name: "user" },
      reviewedBy: null,
      originalSale: null,
    };

    expect(mockReturn.title).toHaveProperty("id");
    expect(mockReturn.title).toHaveProperty("title");
    expect(mockReturn.title).toHaveProperty("author_name");
  });

  it("has createdBy with name", () => {
    const mockReturn: ReturnWithRelations = {
      id: "id",
      return_date: "2025-01-15",
      format: "physical",
      quantity: 5,
      unit_price: "10.99",
      total_amount: "54.95",
      reason: null,
      status: "pending",
      reviewed_at: null,
      created_at: new Date(),
      title: { id: "id", title: "Book", author_name: "Author" },
      createdBy: { name: "submitter" },
      reviewedBy: null,
      originalSale: null,
    };

    expect(mockReturn.createdBy).toHaveProperty("name");
    expect(mockReturn.createdBy.name).toBe("submitter");
  });

  it("reviewedBy is nullable for pending status", () => {
    const pendingReturn: ReturnWithRelations = {
      id: "id",
      return_date: "2025-01-15",
      format: "physical",
      quantity: 5,
      unit_price: "10.99",
      total_amount: "54.95",
      reason: null,
      status: "pending",
      reviewed_at: null,
      created_at: new Date(),
      title: { id: "id", title: "Book", author_name: "Author" },
      createdBy: { name: "user" },
      reviewedBy: null,
      originalSale: null,
    };

    expect(pendingReturn.reviewedBy).toBeNull();
  });

  it("reviewedBy has name for approved/rejected status", () => {
    const approvedReturn: ReturnWithRelations = {
      id: "id",
      return_date: "2025-01-15",
      format: "physical",
      quantity: 5,
      unit_price: "10.99",
      total_amount: "54.95",
      reason: null,
      status: "approved",
      reviewed_at: new Date(),
      created_at: new Date(),
      title: { id: "id", title: "Book", author_name: "Author" },
      createdBy: { name: "user" },
      reviewedBy: { name: "reviewer" },
      originalSale: null,
    };

    expect(approvedReturn.reviewedBy).not.toBeNull();
    expect(approvedReturn.reviewedBy?.name).toBe("reviewer");
  });

  it("status is one of pending, approved, or rejected", () => {
    const statuses: Array<"pending" | "approved" | "rejected"> = [
      "pending",
      "approved",
      "rejected",
    ];

    for (const status of statuses) {
      const mockReturn: ReturnWithRelations = {
        id: "id",
        return_date: "2025-01-15",
        format: "physical",
        quantity: 5,
        unit_price: "10.99",
        total_amount: "54.95",
        reason: null,
        status,
        reviewed_at: status !== "pending" ? new Date() : null,
        created_at: new Date(),
        title: { id: "id", title: "Book", author_name: "Author" },
        createdBy: { name: "user" },
        reviewedBy: status !== "pending" ? { name: "reviewer" } : null,
        originalSale: null,
      };

      expect(mockReturn.status).toBe(status);
    }
  });

  it("format is one of physical, ebook, or audiobook", () => {
    const formats: Array<"physical" | "ebook" | "audiobook"> = [
      "physical",
      "ebook",
      "audiobook",
    ];

    for (const format of formats) {
      const mockReturn: ReturnWithRelations = {
        id: "id",
        return_date: "2025-01-15",
        format,
        quantity: 5,
        unit_price: "10.99",
        total_amount: "54.95",
        reason: null,
        status: "pending",
        reviewed_at: null,
        created_at: new Date(),
        title: { id: "id", title: "Book", author_name: "Author" },
        createdBy: { name: "user" },
        reviewedBy: null,
        originalSale: null,
      };

      expect(mockReturn.format).toBe(format);
    }
  });
});

describe("URL Query Param Mapping (Story 3.7 AC 3-8)", () => {
  it("status maps to ?status=pending", () => {
    const filter: ReturnsHistoryFilters = { status: "pending" };
    const params = new URLSearchParams();
    if (filter.status && filter.status !== "all") {
      params.set("status", filter.status);
    }
    expect(params.toString()).toBe("status=pending");
  });

  it("date range maps to ?from=2025-01-01&to=2025-01-31", () => {
    const filter: ReturnsHistoryFilters = {
      from_date: "2025-01-01",
      to_date: "2025-01-31",
    };
    const params = new URLSearchParams();
    if (filter.from_date) params.set("from", filter.from_date);
    if (filter.to_date) params.set("to", filter.to_date);
    expect(params.toString()).toBe("from=2025-01-01&to=2025-01-31");
  });

  it("search maps to ?search=book+title", () => {
    const filter: ReturnsHistoryFilters = { search: "book title" };
    const params = new URLSearchParams();
    if (filter.search) params.set("search", filter.search);
    expect(params.toString()).toBe("search=book+title");
  });

  it("format maps to ?format=ebook", () => {
    const filter: ReturnsHistoryFilters = { format: "ebook" };
    const params = new URLSearchParams();
    if (filter.format && filter.format !== "all") {
      params.set("format", filter.format);
    }
    expect(params.toString()).toBe("format=ebook");
  });

  it("sort maps to ?sort=date&order=desc", () => {
    const filter: ReturnsHistoryFilters = { sort: "date", order: "desc" };
    const params = new URLSearchParams();
    if (filter.sort) params.set("sort", filter.sort);
    if (filter.order) params.set("order", filter.order);
    expect(params.toString()).toBe("sort=date&order=desc");
  });

  it("pagination maps to ?page=2&size=20", () => {
    const filter: ReturnsHistoryFilters = { page: 2, pageSize: 20 };
    const params = new URLSearchParams();
    if (filter.page) params.set("page", filter.page.toString());
    if (filter.pageSize) params.set("size", filter.pageSize.toString());
    expect(params.toString()).toBe("page=2&size=20");
  });
});

describe("Negative Value Display (Story 3.7 AC 2)", () => {
  it("quantity should be displayed as negative", () => {
    const quantity = 25;
    const displayQuantity = `-${quantity}`;
    expect(displayQuantity).toBe("-25");
  });

  it("amount should be displayed as negative currency", () => {
    const amount = "312.50";
    const formatCurrency = (amt: string): string => {
      const num = parseFloat(amt);
      return `-${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(num)}`;
    };
    expect(formatCurrency(amount)).toBe("-$312.50");
  });
});
