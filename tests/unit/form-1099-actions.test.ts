/**
 * Unit tests for Form 1099 Server Actions
 *
 * Story 11.3 - AC-11.3.3: Server actions for 1099 generation
 *
 * Tests the generate1099Action, generateBatch1099sAction, and download1099Action
 * server actions with mocked dependencies.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing actions
vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(),
  getCurrentTenantId: vi.fn().mockResolvedValue("tenant-123"),
  getCurrentUser: vi
    .fn()
    .mockResolvedValue({ id: "user-123", name: "Test User" }),
  getDb: vi.fn(),
}));

vi.mock("@/db", () => ({
  adminDb: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "form-1099-uuid" }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/modules/form-1099/generator", () => ({
  generateForm1099PDF: vi.fn().mockResolvedValue(Buffer.from("mock-pdf")),
  generate1099S3Key: vi
    .fn()
    .mockReturnValue("1099/tenant-123/2024/form-uuid.pdf"),
}));

vi.mock("@/modules/form-1099/storage", () => ({
  upload1099PDF: vi
    .fn()
    .mockResolvedValue("1099/tenant-123/2024/form-uuid.pdf"),
  get1099DownloadUrl: vi
    .fn()
    .mockResolvedValue("https://s3.presigned.url/1099.pdf"),
}));

vi.mock("@/lib/encryption", () => ({
  decrypt: vi.fn().mockReturnValue("12-3456789"),
}));

// Import after mocks are set up
import { getDb, requirePermission } from "@/lib/auth";
import {
  generate1099Action,
  generateBatch1099sAction,
  get1099DownloadUrlAction,
  get1099StatsAction,
  getAuthors1099InfoAction,
} from "@/modules/form-1099/actions";
import { generateForm1099PDF } from "@/modules/form-1099/generator";
import { get1099DownloadUrl, upload1099PDF } from "@/modules/form-1099/storage";

describe("generate1099Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock for getDb
    const mockDb = {
      query: {
        contacts: {
          findFirst: vi.fn().mockResolvedValue({
            id: "contact-123",
            first_name: "Jane",
            last_name: "Author",
            tin_encrypted: "encrypted-tin",
            tin_last_four: "1234",
            tin_type: "ssn",
            is_us_based: true,
            address_line1: "123 Main St",
            address_line2: null,
            city: "New York",
            state: "NY",
            postal_code: "10001",
            roles: [{ role: "author" }],
          }),
        },
        tenants: {
          findFirst: vi.fn().mockResolvedValue({
            id: "tenant-123",
            payer_ein_encrypted: "encrypted-ein",
            payer_ein_last_four: "6789",
            payer_name: "Acme Publishing",
            payer_address_line1: "456 Corp Ave",
            payer_address_line2: "Suite 100",
            payer_city: "Chicago",
            payer_state: "IL",
            payer_zip: "60601",
          }),
        },
        form1099: {
          findFirst: vi.fn().mockResolvedValue(null), // No existing form
        },
      },
      execute: vi.fn().mockResolvedValue({
        rows: [{ total_earnings: "1500.00" }],
      }),
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );
  });

  it("requires finance/admin/owner permission", async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(
      new Error("UNAUTHORIZED"),
    );

    const result = await generate1099Action({
      contact_id: "contact-123",
      tax_year: 2024,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("permission");
    }
    expect(requirePermission).toHaveBeenCalledWith([
      "finance",
      "admin",
      "owner",
    ]);
  });

  it("validates contact has tax information", async () => {
    const mockDb = {
      query: {
        contacts: {
          findFirst: vi.fn().mockResolvedValue({
            id: "contact-123",
            first_name: "Jane",
            last_name: "Author",
            tin_encrypted: null, // No TIN
            tin_last_four: null,
            tin_type: null,
            is_us_based: true,
            roles: [{ role: "author" }],
          }),
        },
        tenants: {
          findFirst: vi.fn().mockResolvedValue({
            id: "tenant-123",
            payer_ein_encrypted: "encrypted-ein",
            payer_name: "Acme Publishing",
          }),
        },
        form1099: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      execute: vi.fn().mockResolvedValue({
        rows: [{ total_earnings: "1500.00" }],
      }),
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );

    const result = await generate1099Action({
      contact_id: "contact-123",
      tax_year: 2024,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("tax information");
    }
  });

  it("validates tenant has payer information", async () => {
    const mockDb = {
      query: {
        contacts: {
          findFirst: vi.fn().mockResolvedValue({
            id: "contact-123",
            first_name: "Jane",
            last_name: "Author",
            tin_encrypted: "encrypted-tin",
            tin_last_four: "1234",
            tin_type: "ssn",
            is_us_based: true,
            address_line1: "123 Main St",
            city: "New York",
            state: "NY",
            postal_code: "10001",
            roles: [{ role: "author" }],
          }),
        },
        tenants: {
          findFirst: vi.fn().mockResolvedValue({
            id: "tenant-123",
            payer_ein_encrypted: null, // No payer EIN
            payer_name: null,
          }),
        },
        form1099: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      execute: vi.fn().mockResolvedValue({
        rows: [{ total_earnings: "1500.00" }],
      }),
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );

    const result = await generate1099Action({
      contact_id: "contact-123",
      tax_year: 2024,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("payer information");
    }
  });

  it("prevents duplicate 1099 generation for same contact/year", async () => {
    const mockDb = {
      query: {
        contacts: {
          findFirst: vi.fn().mockResolvedValue({
            id: "contact-123",
            first_name: "Jane",
            last_name: "Author",
            tin_encrypted: "encrypted-tin",
            tin_last_four: "1234",
            tin_type: "ssn",
            is_us_based: true,
            roles: [{ role: "author" }],
          }),
        },
        tenants: {
          findFirst: vi.fn().mockResolvedValue({
            id: "tenant-123",
            payer_ein_encrypted: "encrypted-ein",
            payer_name: "Acme Publishing",
          }),
        },
        form1099: {
          findFirst: vi.fn().mockResolvedValue({
            id: "existing-form",
            tax_year: 2024,
          }), // Already exists
        },
      },
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );

    const result = await generate1099Action({
      contact_id: "contact-123",
      tax_year: 2024,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already generated");
    }
  });

  it("validates US-based requirement for 1099", async () => {
    const mockDb = {
      query: {
        contacts: {
          findFirst: vi.fn().mockResolvedValue({
            id: "contact-123",
            first_name: "Jane",
            last_name: "Author",
            tin_encrypted: "encrypted-tin",
            tin_last_four: "1234",
            tin_type: "ssn",
            is_us_based: false, // Not US-based
            roles: [{ role: "author" }],
          }),
        },
        tenants: {
          findFirst: vi.fn().mockResolvedValue({
            id: "tenant-123",
            payer_ein_encrypted: "encrypted-ein",
            payer_name: "Acme Publishing",
          }),
        },
        form1099: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );

    const result = await generate1099Action({
      contact_id: "contact-123",
      tax_year: 2024,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("US-based");
    }
  });

  it("validates earnings meet $600 threshold", async () => {
    const mockDb = {
      query: {
        contacts: {
          findFirst: vi.fn().mockResolvedValue({
            id: "contact-123",
            first_name: "Jane",
            last_name: "Author",
            tin_encrypted: "encrypted-tin",
            tin_last_four: "1234",
            tin_type: "ssn",
            is_us_based: true,
            address_line1: "123 Main St",
            city: "New York",
            state: "NY",
            postal_code: "10001",
            roles: [{ role: "author" }],
          }),
        },
        tenants: {
          findFirst: vi.fn().mockResolvedValue({
            id: "tenant-123",
            payer_ein_encrypted: "encrypted-ein",
            payer_ein_last_four: "6789",
            payer_name: "Acme Publishing",
            payer_address_line1: "456 Corp Ave",
            payer_city: "Chicago",
            payer_state: "IL",
            payer_zip: "60601",
          }),
        },
        form1099: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      execute: vi.fn().mockResolvedValue({
        rows: [{ total_earnings: "500.00" }], // Below threshold
      }),
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );

    const result = await generate1099Action({
      contact_id: "contact-123",
      tax_year: 2024,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("$600");
    }
  });

  it("generates PDF and stores in S3 on success", async () => {
    const result = await generate1099Action({
      contact_id: "contact-123",
      tax_year: 2024,
    });

    expect(result.success).toBe(true);
    expect(generateForm1099PDF).toHaveBeenCalled();
    expect(upload1099PDF).toHaveBeenCalled();
  });
});

describe("generateBatch1099sAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires finance/admin/owner permission", async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(
      new Error("UNAUTHORIZED"),
    );

    const result = await generateBatch1099sAction({
      tax_year: 2024,
      contact_ids: ["contact-123"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("permission");
    }
  });

  it("validates at least one contact is provided", async () => {
    const result = await generateBatch1099sAction({
      tax_year: 2024,
      contact_ids: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.toLowerCase()).toContain("at least one");
    }
  });

  it("returns batch generation results", async () => {
    const mockDb = {
      query: {
        contacts: {
          findFirst: vi.fn().mockResolvedValue({
            id: "contact-123",
            first_name: "Jane",
            last_name: "Author",
            tin_encrypted: "encrypted-tin",
            tin_last_four: "1234",
            tin_type: "ssn",
            is_us_based: true,
            address_line1: "123 Main St",
            city: "New York",
            state: "NY",
            postal_code: "10001",
            roles: [{ role: "author" }],
          }),
        },
        tenants: {
          findFirst: vi.fn().mockResolvedValue({
            id: "tenant-123",
            payer_ein_encrypted: "encrypted-ein",
            payer_ein_last_four: "6789",
            payer_name: "Acme Publishing",
            payer_address_line1: "456 Corp Ave",
            payer_city: "Chicago",
            payer_state: "IL",
            payer_zip: "60601",
          }),
        },
        form1099: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      execute: vi.fn().mockResolvedValue({
        rows: [{ total_earnings: "1500.00" }],
      }),
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );

    const result = await generateBatch1099sAction({
      tax_year: 2024,
      contact_ids: ["contact-123"],
    });

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.success_count).toBeGreaterThanOrEqual(0);
      expect(result.data.results).toBeDefined();
    }
  });
});

describe("get1099DownloadUrlAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires finance/admin/owner permission", async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(
      new Error("UNAUTHORIZED"),
    );

    const result = await get1099DownloadUrlAction("form-1099-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("permission");
    }
  });

  it("returns 404 for non-existent form", async () => {
    const mockDb = {
      query: {
        form1099: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );

    const result = await get1099DownloadUrlAction("non-existent-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }
  });

  it("returns presigned URL for valid form", async () => {
    const mockDb = {
      query: {
        form1099: {
          findFirst: vi.fn().mockResolvedValue({
            id: "form-1099-uuid",
            tenant_id: "tenant-123",
            pdf_s3_key: "1099/tenant-123/2024/form-uuid.pdf",
          }),
        },
      },
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );

    const result = await get1099DownloadUrlAction("form-1099-uuid");

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.url).toContain("s3");
    }
    expect(get1099DownloadUrl).toHaveBeenCalled();
  });
});

describe("get1099StatsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires finance/admin/owner permission", async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(
      new Error("UNAUTHORIZED"),
    );

    const result = await get1099StatsAction(2024);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("permission");
    }
  });

  it("returns stats for tax year", async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            total_authors: 10,
            eligible_authors: 5,
            with_tax_info: 4,
            us_based: 5,
            already_generated: 2,
            total_earnings: "5000.00",
          },
        ],
      }),
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );

    const result = await get1099StatsAction(2024);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.totalAuthors).toBe(10);
      expect(result.data.eligibleAuthors).toBe(5);
    }
  });
});

describe("getAuthors1099InfoAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires finance/admin/owner permission", async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(
      new Error("UNAUTHORIZED"),
    );

    const result = await getAuthors1099InfoAction(2024);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("permission");
    }
  });

  it("returns authors with 1099 eligibility info", async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "contact-123",
            first_name: "Jane",
            last_name: "Author",
            email: "jane@example.com",
            tin_encrypted: "encrypted-tin",
            tin_last_four: "1234",
            tin_type: "ssn",
            is_us_based: true,
            total_earnings: "1500.00",
            has_generated_1099: false,
            generated_1099_at: null,
            address_line1: "123 Main St",
            address_line2: null,
            city: "New York",
            state: "NY",
            postal_code: "10001",
          },
        ],
      }),
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );

    const result = await getAuthors1099InfoAction(2024);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe("Jane Author");
      expect(result.data[0].meets_threshold).toBe(true);
    }
  });
});
