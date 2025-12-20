/**
 * ONIX Export Actions Tests
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 * Task 4: Implement export Server Actions
 *
 * Tests for Server Actions that export titles to ONIX XML.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module
vi.mock("@/lib/auth", () => ({
  getCurrentTenantId: vi.fn(),
  getDb: vi.fn(),
  requirePermission: vi.fn(),
}));

// Mock the title-authors queries
vi.mock("@/modules/title-authors/queries", () => ({
  getTitleWithAuthors: vi.fn(),
}));

// Mock the validator
vi.mock("@/modules/onix/validator", () => ({
  validateONIXMessage: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
}));

import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import { CREATE_AUTHORS_TITLES } from "@/lib/permissions";
import {
  exportBatchTitles,
  exportSingleTitle,
  validateONIXExport,
} from "@/modules/onix/actions";
import { validateONIXMessage } from "@/modules/onix/validator";
import type { TitleWithAuthors } from "@/modules/title-authors/queries";
import { getTitleWithAuthors } from "@/modules/title-authors/queries";

// Mock tenant (matches actual tenant schema)
const mockTenant = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  subdomain: "acme",
  name: "Acme Publishing",
  timezone: "America/New_York",
  fiscal_year_start: null,
  default_currency: "USD",
  statement_frequency: "quarterly",
  royalty_period_type: "fiscal_year",
  royalty_period_start_month: null,
  royalty_period_start_day: null,
  status: "active",
  suspended_at: null,
  suspended_reason: null,
  suspended_by_admin_email: null,
  payer_ein_encrypted: null,
  payer_ein_last_four: null,
  payer_name: null,
  payer_address_line1: null,
  payer_address_line2: null,
  payer_city: null,
  payer_state: null,
  payer_zip: null,
  created_at: new Date("2025-01-01"),
  updated_at: new Date("2025-01-01"),
};

// Mock title with authors (matches TitleWithAuthors interface)
const mockTitleWithAuthors: TitleWithAuthors = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  title: "The Great Gatsby",
  subtitle: "A Novel",
  isbn: "9781234567890",
  tenant_id: mockTenant.id,
  publication_status: "published",
  created_at: new Date("2025-01-01"),
  updated_at: new Date("2025-01-01"),
  authors: [
    {
      id: "auth1",
      title_id: "660e8400-e29b-41d4-a716-446655440001",
      contact_id: "contact1",
      ownership_percentage: "100.00",
      is_primary: true,
      created_at: new Date("2025-01-01"),
      updated_at: new Date("2025-01-01"),
      created_by: null,
      contact: {
        id: "contact1",
        tenant_id: mockTenant.id,
        first_name: "F. Scott",
        last_name: "Fitzgerald",
        email: "scott@example.com",
        phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        postal_code: null,
        country: null,
        tax_id: null,
        tin_encrypted: null,
        tin_type: null,
        tin_last_four: null,
        is_us_based: true,
        w9_received: false,
        w9_received_date: null,
        payment_info: null,
        notes: null,
        status: "active",
        portal_user_id: null,
        created_at: new Date("2025-01-01"),
        updated_at: new Date("2025-01-01"),
        created_by: null,
      },
    },
  ],
  primaryAuthor: null,
  isSoleAuthor: true,
  // Story 14.3: Accessibility metadata
  epub_accessibility_conformance: null,
  accessibility_features: null,
  accessibility_hazards: null,
  accessibility_summary: null,
  // Story 19.5: BISAC subject codes
  bisac_code: null,
  bisac_codes: null,
};

// Mock database
const createMockDb = () => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([mockTenant]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
});

let mockDb: ReturnType<typeof createMockDb>;

describe("exportSingleTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getCurrentTenantId).mockResolvedValue(mockTenant.id);
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(getTitleWithAuthors).mockResolvedValue(mockTitleWithAuthors);
  });

  it("returns ActionResult with success and xml data", async () => {
    const result = await exportSingleTitle(mockTitleWithAuthors.id);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.xml).toContain('<ONIXMessage release="3.1"');
      expect(result.data.filename).toContain("salina-onix-");
      expect(result.data.filename).toContain(".xml");
    }
  });

  it("checks CREATE_AUTHORS_TITLES permission", async () => {
    await exportSingleTitle(mockTitleWithAuthors.id);

    expect(requirePermission).toHaveBeenCalled();
  });

  it("returns error when permission denied", async () => {
    vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

    const result = await exportSingleTitle(mockTitleWithAuthors.id);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Permission denied");
    }
  });

  it("returns error when title not found", async () => {
    vi.mocked(getTitleWithAuthors).mockResolvedValue(null);

    const result = await exportSingleTitle("nonexistent-id");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }
  });

  it("returns error when title has no ISBN", async () => {
    vi.mocked(getTitleWithAuthors).mockResolvedValue({
      ...mockTitleWithAuthors,
      isbn: null,
    });

    const result = await exportSingleTitle(mockTitleWithAuthors.id);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("ISBN");
    }
  });

  it("generates XML with proper ONIX 3.1 structure", async () => {
    const result = await exportSingleTitle(mockTitleWithAuthors.id);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.xml).toContain('<ONIXMessage release="3.1"');
      expect(result.data.xml).toContain("<Header>");
      expect(result.data.xml).toContain("<Product>");
      expect(result.data.xml).toContain("<RecordReference>");
    }
  });

  it("includes tenant info in header", async () => {
    const result = await exportSingleTitle(mockTitleWithAuthors.id);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.xml).toContain(
        `<SenderName>${mockTenant.name}</SenderName>`,
      );
    }
  });
});

describe("exportSingleTitle - validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getCurrentTenantId).mockResolvedValue(mockTenant.id);
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(getTitleWithAuthors).mockResolvedValue(mockTitleWithAuthors);
  });

  it("includes validation result in response (AC: 5)", async () => {
    const result = await exportSingleTitle(mockTitleWithAuthors.id);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.validation).toBeDefined();
      expect(result.data.validation?.valid).toBe(true);
      expect(result.data.validation?.errors).toEqual([]);
    }
  });

  it("stores export with success status when validation passes", async () => {
    await exportSingleTitle(mockTitleWithAuthors.id);

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        error_message: null,
      }),
    );
  });
});

describe("exportBatchTitles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getCurrentTenantId).mockResolvedValue(mockTenant.id);
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(getTitleWithAuthors).mockResolvedValue(mockTitleWithAuthors);
  });

  it("returns ActionResult with success for multiple titles", async () => {
    const titleIds = [mockTitleWithAuthors.id, "another-title-id"];

    const result = await exportBatchTitles(titleIds);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.xml).toContain('<ONIXMessage release="3.1"');
      expect(result.data.productCount).toBeGreaterThanOrEqual(1);
    }
  });

  it("checks permission before export", async () => {
    await exportBatchTitles([mockTitleWithAuthors.id]);

    expect(requirePermission).toHaveBeenCalled();
  });

  it("returns error when permission denied", async () => {
    vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

    const result = await exportBatchTitles([mockTitleWithAuthors.id]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Permission denied");
    }
  });

  it("returns error for empty title list", async () => {
    const result = await exportBatchTitles([]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("title");
    }
  });

  it("skips titles without ISBN and continues", async () => {
    vi.mocked(getTitleWithAuthors)
      .mockResolvedValueOnce({ ...mockTitleWithAuthors, isbn: null })
      .mockResolvedValueOnce(mockTitleWithAuthors);

    const result = await exportBatchTitles([
      "no-isbn-id",
      mockTitleWithAuthors.id,
    ]);

    expect(result.success).toBe(true);
    if (result.success) {
      // Should only include titles with ISBN
      expect(result.data.productCount).toBe(1);
    }
  });

  it("returns productCount matching exported titles", async () => {
    const result = await exportBatchTitles([mockTitleWithAuthors.id]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productCount).toBe(1);
    }
  });

  it("includes validation result in response (AC: 5)", async () => {
    const result = await exportBatchTitles([mockTitleWithAuthors.id]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.validation).toBeDefined();
      expect(result.data.validation?.valid).toBe(true);
      expect(result.data.validation?.errors).toEqual([]);
    }
  });

  it("stores export with success status when validation passes", async () => {
    await exportBatchTitles([mockTitleWithAuthors.id]);

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        error_message: null,
      }),
    );
  });
});

// Story 14.6: ONIX 3.0 Export Fallback Tests
describe("exportSingleTitle - version support (Story 14.6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getCurrentTenantId).mockResolvedValue(mockTenant.id);
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(getTitleWithAuthors).mockResolvedValue(mockTitleWithAuthors);
  });

  it("generates ONIX 3.0 when version specified", async () => {
    const result = await exportSingleTitle(mockTitleWithAuthors.id, {
      onixVersion: "3.0",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.xml).toContain('release="3.0"');
      expect(result.data.xml).toContain(
        'xmlns="http://ns.editeur.org/onix/3.0/reference"',
      );
    }
  });

  it("generates ONIX 3.1 by default (no version option)", async () => {
    const result = await exportSingleTitle(mockTitleWithAuthors.id);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.xml).toContain('release="3.1"');
      expect(result.data.xml).toContain(
        'xmlns="http://ns.editeur.org/onix/3.1/reference"',
      );
    }
  });

  it("includes version in filename for 3.0", async () => {
    const result = await exportSingleTitle(mockTitleWithAuthors.id, {
      onixVersion: "3.0",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filename).toMatch(/salina-onix-30-/);
    }
  });

  it("includes version in filename for 3.1", async () => {
    const result = await exportSingleTitle(mockTitleWithAuthors.id, {
      onixVersion: "3.1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filename).toMatch(/salina-onix-31-/);
    }
  });

  it("stores onix_version in export record", async () => {
    await exportSingleTitle(mockTitleWithAuthors.id, { onixVersion: "3.0" });

    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        onix_version: "3.0",
      }),
    );
  });

  it("returns onixVersion in result data", async () => {
    const result = await exportSingleTitle(mockTitleWithAuthors.id, {
      onixVersion: "3.0",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.onixVersion).toBe("3.0");
    }
  });
});

describe("exportBatchTitles - version support (Story 14.6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getCurrentTenantId).mockResolvedValue(mockTenant.id);
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(getTitleWithAuthors).mockResolvedValue(mockTitleWithAuthors);
  });

  it("generates ONIX 3.0 when version specified", async () => {
    const result = await exportBatchTitles([mockTitleWithAuthors.id], {
      onixVersion: "3.0",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.xml).toContain('release="3.0"');
      expect(result.data.xml).toContain(
        'xmlns="http://ns.editeur.org/onix/3.0/reference"',
      );
    }
  });

  it("generates ONIX 3.1 by default", async () => {
    const result = await exportBatchTitles([mockTitleWithAuthors.id]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.xml).toContain('release="3.1"');
    }
  });

  it("includes version in filename", async () => {
    const result = await exportBatchTitles([mockTitleWithAuthors.id], {
      onixVersion: "3.0",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filename).toMatch(/salina-onix-30-/);
    }
  });

  it("stores onix_version in export record", async () => {
    await exportBatchTitles([mockTitleWithAuthors.id], { onixVersion: "3.0" });

    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        onix_version: "3.0",
      }),
    );
  });

  it("returns onixVersion in result data", async () => {
    const result = await exportBatchTitles([mockTitleWithAuthors.id], {
      onixVersion: "3.0",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.onixVersion).toBe("3.0");
    }
  });
});

describe("validateONIXExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockResolvedValue(undefined);
  });

  it("returns ActionResult with validation result on success", async () => {
    vi.mocked(validateONIXMessage).mockResolvedValue({
      valid: true,
      errors: [],
    });

    const result = await validateONIXExport("<ONIXMessage></ONIXMessage>");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.valid).toBe(true);
      expect(result.data.errors).toEqual([]);
    }
  });

  it("checks CREATE_AUTHORS_TITLES permission", async () => {
    await validateONIXExport("<ONIXMessage></ONIXMessage>");

    expect(requirePermission).toHaveBeenCalledWith(CREATE_AUTHORS_TITLES);
  });

  it("returns error when permission denied", async () => {
    vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

    const result = await validateONIXExport("<ONIXMessage></ONIXMessage>");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Permission denied");
    }
  });

  it("returns validation errors when XML is invalid", async () => {
    const mockErrors = [
      {
        type: "schema" as const,
        code: "MISSING_ROOT",
        message: "ONIXMessage root element is required",
        path: "/",
      },
    ];
    vi.mocked(validateONIXMessage).mockResolvedValue({
      valid: false,
      errors: mockErrors,
    });

    const result = await validateONIXExport("<Invalid></Invalid>");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.valid).toBe(false);
      expect(result.data.errors).toEqual(mockErrors);
    }
  });

  it("calls validateONIXMessage with provided XML", async () => {
    const testXml = "<ONIXMessage><Product></Product></ONIXMessage>";
    await validateONIXExport(testXml);

    expect(validateONIXMessage).toHaveBeenCalledWith(testXml);
  });
});
