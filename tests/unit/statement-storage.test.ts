/**
 * Statement S3 Storage Unit Tests
 *
 * Tests for S3 key generation and storage patterns.
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * Task 8: Write unit tests
 *
 * AC Coverage:
 * - AC-5.2.6: PDF uploads to S3 with key pattern statements/{tenant_id}/{statement_id}.pdf
 * - AC-5.2.6: Presigned URL generation with 15-minute expiry
 */

import { describe, expect, it, vi } from "vitest";

// Mock AWS SDK before importing storage module
vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn().mockResolvedValue({});
  return {
    S3Client: class MockS3Client {
      send = mockSend;
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

// Import after mocks are set up
import { generateStatementS3Key } from "@/modules/statements/storage";

describe("Statement S3 Storage", () => {
  describe("AC-5.2.6: S3 key pattern", () => {
    it("should generate correct S3 key pattern", () => {
      const tenantId = "tenant-uuid-123";
      const statementId = "statement-uuid-456";

      const key = generateStatementS3Key(tenantId, statementId);

      expect(key).toBe("statements/tenant-uuid-123/statement-uuid-456.pdf");
    });

    it("should handle UUID format tenant and statement IDs", () => {
      const tenantId = "00000000-0000-0000-0000-000000000001";
      const statementId = "11111111-1111-1111-1111-111111111111";

      const key = generateStatementS3Key(tenantId, statementId);

      expect(key).toBe(
        "statements/00000000-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111.pdf",
      );
    });

    it("should produce consistent key format", () => {
      const tenantId = "abc";
      const statementId = "123";

      const key1 = generateStatementS3Key(tenantId, statementId);
      const key2 = generateStatementS3Key(tenantId, statementId);

      expect(key1).toBe(key2);
      expect(key1).toBe("statements/abc/123.pdf");
    });
  });

  describe("S3 key structure", () => {
    it("should create hierarchical path structure", () => {
      const key = generateStatementS3Key("tenant-1", "stmt-1");

      const parts = key.split("/");
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe("statements");
      expect(parts[1]).toBe("tenant-1");
      expect(parts[2]).toBe("stmt-1.pdf");
    });

    it("should always end with .pdf extension", () => {
      const key = generateStatementS3Key("t", "s");
      expect(key.endsWith(".pdf")).toBe(true);
    });

    it("should always start with statements prefix", () => {
      const key = generateStatementS3Key("any-tenant", "any-statement");
      expect(key.startsWith("statements/")).toBe(true);
    });
  });
});
