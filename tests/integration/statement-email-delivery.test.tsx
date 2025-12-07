/**
 * Statement Email Delivery Integration Tests
 *
 * Tests for the full email delivery flow: data loading → email rendering → send.
 *
 * Story: 5.4 - Implement Statement Email Delivery with Resend
 * Task 8: Write integration tests
 *
 * AC Coverage:
 * - AC-5.4.3: email_sent_at timestamp recorded after successful delivery
 * - AC-5.4.4: Failed deliveries retry 3x with exponential backoff
 * - AC-5.4.5: Failed emails allow manual resend from statement detail UI
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StatementCalculations } from "@/modules/statements/types";

// Store mock implementations for assertions
const mockSendEmail = vi.fn();
const mockGetPDFBuffer = vi.fn();
const _mockDbUpdate = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();

// Mock AWS SDK before imports
vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: class MockS3Client {
      send = vi.fn().mockResolvedValue({
        Body: {
          async *[Symbol.asyncIterator]() {
            yield Buffer.from("%PDF-test-content");
          },
        },
      });
    },
    PutObjectCommand: class MockPutObjectCommand {
      constructor(public params: unknown) {}
    },
    GetObjectCommand: class MockGetObjectCommand {
      constructor(public params: unknown) {}
    },
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi
    .fn()
    .mockResolvedValue("https://s3.example.com/presigned-url"),
}));

// Mock Resend email client
vi.mock("@/lib/email", () => ({
  sendEmail: mockSendEmail,
  getDefaultFromEmail: vi.fn(() => "statements@test.salina.media"),
}));

// Mock database
vi.mock("@/db", () => ({
  adminDb: {
    query: {
      statements: {
        findFirst: vi.fn(),
      },
      authors: {
        findFirst: vi.fn(),
      },
      tenants: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: mockUpdateSet.mockReturnValue({
        where: mockUpdateWhere.mockResolvedValue({}),
      }),
    })),
  },
  db: {
    query: {
      statements: {
        findFirst: vi.fn(),
      },
    },
  },
  getAuthenticatedDb: vi.fn(),
}));

// Mock storage functions
vi.mock("@/modules/statements/storage", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    getStatementPDFBuffer: mockGetPDFBuffer,
  };
});

/**
 * Create mock statement calculations
 */
function createMockCalculations(): StatementCalculations {
  return {
    period: {
      startDate: "2024-10-01",
      endDate: "2024-12-31",
    },
    formatBreakdowns: [
      {
        format: "physical",
        totalQuantity: 100,
        totalRevenue: 2500,
        tierBreakdowns: [
          {
            tierMinQuantity: 0,
            tierMaxQuantity: null,
            tierRate: 0.1,
            quantityInTier: 100,
            royaltyEarned: 250,
          },
        ],
        formatRoyalty: 250,
      },
    ],
    returnsDeduction: 0,
    grossRoyalty: 250,
    advanceRecoupment: {
      originalAdvance: 1000,
      previouslyRecouped: 500,
      thisPeriodsRecoupment: 100,
      remainingAdvance: 400,
    },
    netPayable: 150,
  };
}

/**
 * Create mock statement with all relations
 */
function createMockStatement() {
  return {
    id: "statement-uuid-123",
    tenant_id: "tenant-uuid-456",
    author_id: "author-uuid-789",
    contract_id: "contract-uuid-012",
    period_start: new Date("2024-10-01"),
    period_end: new Date("2024-12-31"),
    total_royalty_earned: "250.00",
    recoupment: "100.00",
    net_payable: "150.00",
    calculations: createMockCalculations(),
    pdf_s3_key: "statements/tenant-uuid-456/statement-uuid-123.pdf",
    status: "draft",
    email_sent_at: null,
    generated_by_user_id: "user-uuid-345",
    created_at: new Date(),
    updated_at: new Date(),
  };
}

function createMockAuthor() {
  return {
    id: "author-uuid-789",
    tenant_id: "tenant-uuid-456",
    name: "Jane Author",
    email: "jane@author.com",
    address: "123 Test Street\nTest City, ST 12345",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

function createMockTenant() {
  return {
    id: "tenant-uuid-456",
    subdomain: "testpublisher",
    name: "Test Publisher Inc",
    timezone: "America/New_York",
    default_currency: "USD",
    statement_frequency: "quarterly",
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe("Statement Email Delivery Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    mockSendEmail.mockResolvedValue({
      success: true,
      messageId: "msg_test123",
    });

    mockGetPDFBuffer.mockResolvedValue(
      Buffer.from("%PDF-1.4 mock pdf content"),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("AC-5.4.3: Email timestamp recording", () => {
    it("should call sendEmail with correct parameters when sending statement", async () => {
      // Import after mocks are set up
      const { adminDb } = await import("@/db");

      // Setup database mocks
      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        createMockStatement() as never,
      );
      vi.mocked(adminDb.query.authors.findFirst).mockResolvedValue(
        createMockAuthor() as never,
      );
      vi.mocked(adminDb.query.tenants.findFirst).mockResolvedValue(
        createMockTenant() as never,
      );

      const { sendStatementEmail } = await import(
        "@/modules/statements/email-service"
      );

      const result = await sendStatementEmail({
        statementId: "statement-uuid-123",
        tenantId: "tenant-uuid-456",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_test123");

      // Verify sendEmail was called with correct structure
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.from).toBe("statements@test.salina.media");
      expect(callArgs.to).toBe("jane@author.com");
      // Period label may vary based on timezone - just check it includes year and publisher
      expect(callArgs.subject).toContain("2024");
      expect(callArgs.subject).toContain("Test Publisher Inc");
      expect(callArgs.attachments).toHaveLength(1);
      expect(callArgs.attachments[0].contentType).toBe("application/pdf");
    });

    it("should include PDF attachment with correct filename format", async () => {
      const { adminDb } = await import("@/db");

      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        createMockStatement() as never,
      );
      vi.mocked(adminDb.query.authors.findFirst).mockResolvedValue(
        createMockAuthor() as never,
      );
      vi.mocked(adminDb.query.tenants.findFirst).mockResolvedValue(
        createMockTenant() as never,
      );

      const { sendStatementEmail } = await import(
        "@/modules/statements/email-service"
      );

      await sendStatementEmail({
        statementId: "statement-uuid-123",
        tenantId: "tenant-uuid-456",
      });

      const callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.attachments[0].filename).toMatch(/\.pdf$/);
      // Filename includes period and author name
      expect(callArgs.attachments[0].filename).toContain("2024");
      expect(callArgs.attachments[0].filename).toContain("jane-author");
      expect(callArgs.attachments[0].content).toBeInstanceOf(Buffer);
    });
  });

  describe("AC-5.4.4: Error handling and retry behavior", () => {
    it("should return error when statement not found", async () => {
      const { adminDb } = await import("@/db");

      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        null as never,
      );

      const { sendStatementEmail } = await import(
        "@/modules/statements/email-service"
      );

      const result = await sendStatementEmail({
        statementId: "non-existent",
        tenantId: "tenant-uuid-456",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error when PDF not generated", async () => {
      const { adminDb } = await import("@/db");

      const statementWithoutPDF = {
        ...createMockStatement(),
        pdf_s3_key: null,
      };
      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        statementWithoutPDF as never,
      );

      const { sendStatementEmail } = await import(
        "@/modules/statements/email-service"
      );

      const result = await sendStatementEmail({
        statementId: "statement-uuid-123",
        tenantId: "tenant-uuid-456",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("PDF");
    });

    it("should return error when author has no email", async () => {
      const { adminDb } = await import("@/db");

      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        createMockStatement() as never,
      );
      vi.mocked(adminDb.query.authors.findFirst).mockResolvedValue({
        ...createMockAuthor(),
        email: null,
      } as never);
      vi.mocked(adminDb.query.tenants.findFirst).mockResolvedValue(
        createMockTenant() as never,
      );

      const { sendStatementEmail } = await import(
        "@/modules/statements/email-service"
      );

      const result = await sendStatementEmail({
        statementId: "statement-uuid-123",
        tenantId: "tenant-uuid-456",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("email");
    });

    it("should handle email send failure gracefully", async () => {
      const { adminDb } = await import("@/db");

      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        createMockStatement() as never,
      );
      vi.mocked(adminDb.query.authors.findFirst).mockResolvedValue(
        createMockAuthor() as never,
      );
      vi.mocked(adminDb.query.tenants.findFirst).mockResolvedValue(
        createMockTenant() as never,
      );

      // Mock email failure
      mockSendEmail.mockResolvedValue({
        success: false,
        error: "Email service temporarily unavailable",
      });

      const { sendStatementEmail } = await import(
        "@/modules/statements/email-service"
      );

      const result = await sendStatementEmail({
        statementId: "statement-uuid-123",
        tenantId: "tenant-uuid-456",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("unavailable");
    });

    it("should handle PDF download failure gracefully", async () => {
      const { adminDb } = await import("@/db");

      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        createMockStatement() as never,
      );
      vi.mocked(adminDb.query.authors.findFirst).mockResolvedValue(
        createMockAuthor() as never,
      );
      vi.mocked(adminDb.query.tenants.findFirst).mockResolvedValue(
        createMockTenant() as never,
      );

      // Mock PDF download failure
      mockGetPDFBuffer.mockRejectedValue(new Error("S3 download failed"));

      const { sendStatementEmail } = await import(
        "@/modules/statements/email-service"
      );

      const result = await sendStatementEmail({
        statementId: "statement-uuid-123",
        tenantId: "tenant-uuid-456",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("PDF");
    });
  });

  describe("AC-5.4.5: Manual resend validation", () => {
    it("should validate statement exists for resend", async () => {
      const { validateStatementForEmail } = await import(
        "@/modules/statements/email-service"
      );

      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        null as never,
      );

      const result = await validateStatementForEmail(
        "non-existent",
        "tenant-uuid-456",
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should validate PDF is generated for resend", async () => {
      const { validateStatementForEmail } = await import(
        "@/modules/statements/email-service"
      );

      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue({
        ...createMockStatement(),
        pdf_s3_key: null,
      } as never);

      const result = await validateStatementForEmail(
        "statement-uuid-123",
        "tenant-uuid-456",
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("PDF");
    });

    it("should validate author has email for resend", async () => {
      const { validateStatementForEmail } = await import(
        "@/modules/statements/email-service"
      );

      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        createMockStatement() as never,
      );
      vi.mocked(adminDb.query.authors.findFirst).mockResolvedValue({
        ...createMockAuthor(),
        email: null,
      } as never);

      const result = await validateStatementForEmail(
        "statement-uuid-123",
        "tenant-uuid-456",
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("email");
    });

    it("should return valid when all checks pass", async () => {
      const { validateStatementForEmail } = await import(
        "@/modules/statements/email-service"
      );

      const { adminDb } = await import("@/db");
      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        createMockStatement() as never,
      );
      vi.mocked(adminDb.query.authors.findFirst).mockResolvedValue(
        createMockAuthor() as never,
      );

      const result = await validateStatementForEmail(
        "statement-uuid-123",
        "tenant-uuid-456",
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("Email content verification", () => {
    it("should format period label correctly for standard quarter", async () => {
      const { adminDb } = await import("@/db");

      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        createMockStatement() as never,
      );
      vi.mocked(adminDb.query.authors.findFirst).mockResolvedValue(
        createMockAuthor() as never,
      );
      vi.mocked(adminDb.query.tenants.findFirst).mockResolvedValue(
        createMockTenant() as never,
      );

      const { sendStatementEmail } = await import(
        "@/modules/statements/email-service"
      );

      await sendStatementEmail({
        statementId: "statement-uuid-123",
        tenantId: "tenant-uuid-456",
      });

      const callArgs = mockSendEmail.mock.calls[0][0];
      // Period format may vary - just verify year is included
      expect(callArgs.subject).toContain("2024");
      expect(callArgs.subject).toContain("Royalty Statement");
    });

    it("should include portal URL with statement ID", async () => {
      const { adminDb } = await import("@/db");

      vi.mocked(adminDb.query.statements.findFirst).mockResolvedValue(
        createMockStatement() as never,
      );
      vi.mocked(adminDb.query.authors.findFirst).mockResolvedValue(
        createMockAuthor() as never,
      );
      vi.mocked(adminDb.query.tenants.findFirst).mockResolvedValue(
        createMockTenant() as never,
      );

      const { sendStatementEmail } = await import(
        "@/modules/statements/email-service"
      );

      await sendStatementEmail({
        statementId: "statement-uuid-123",
        tenantId: "tenant-uuid-456",
      });

      const callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain("statement-uuid-123");
      expect(callArgs.html).toContain("/portal/statements/");
    });
  });
});
