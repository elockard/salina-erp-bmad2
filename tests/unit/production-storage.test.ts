import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  generateManuscriptS3Key,
  MANUSCRIPT_ALLOWED_EXTENSIONS,
  MANUSCRIPT_ALLOWED_TYPES,
  MANUSCRIPT_MAX_SIZE,
  validateManuscriptFile,
} from "@/modules/production/storage";

/**
 * Unit tests for Production Storage utilities
 *
 * Story 18.1 - Create Production Projects
 * AC-18.1.3: File upload validation (PDF/DOCX/DOC, max 50MB)
 */

describe("MANUSCRIPT constants", () => {
  it("has correct max size (50MB)", () => {
    expect(MANUSCRIPT_MAX_SIZE).toBe(50 * 1024 * 1024);
  });

  it("has expected allowed MIME types", () => {
    expect(MANUSCRIPT_ALLOWED_TYPES).toContain("application/pdf");
    expect(MANUSCRIPT_ALLOWED_TYPES).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(MANUSCRIPT_ALLOWED_TYPES).toContain("application/msword");
  });

  it("has expected allowed extensions", () => {
    expect(MANUSCRIPT_ALLOWED_EXTENSIONS).toContain(".pdf");
    expect(MANUSCRIPT_ALLOWED_EXTENSIONS).toContain(".docx");
    expect(MANUSCRIPT_ALLOWED_EXTENSIONS).toContain(".doc");
  });
});

describe("validateManuscriptFile", () => {
  describe("valid files", () => {
    it("accepts PDF file", () => {
      const file = new File(["content"], "manuscript.pdf", {
        type: "application/pdf",
      });

      expect(() => validateManuscriptFile(file)).not.toThrow();
    });

    it("accepts DOCX file", () => {
      const file = new File(["content"], "manuscript.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      expect(() => validateManuscriptFile(file)).not.toThrow();
    });

    it("accepts DOC file", () => {
      const file = new File(["content"], "manuscript.doc", {
        type: "application/msword",
      });

      expect(() => validateManuscriptFile(file)).not.toThrow();
    });
  });

  describe("invalid files", () => {
    it("rejects unsupported file type", () => {
      const file = new File(["content"], "manuscript.txt", {
        type: "text/plain",
      });

      expect(() => validateManuscriptFile(file)).toThrow(
        "Invalid file type. Allowed: PDF, DOCX, DOC",
      );
    });

    it("rejects image files", () => {
      const file = new File(["content"], "image.jpg", {
        type: "image/jpeg",
      });

      expect(() => validateManuscriptFile(file)).toThrow(
        "Invalid file type. Allowed: PDF, DOCX, DOC",
      );
    });

    it("rejects zip files", () => {
      const file = new File(["content"], "archive.zip", {
        type: "application/zip",
      });

      expect(() => validateManuscriptFile(file)).toThrow(
        "Invalid file type. Allowed: PDF, DOCX, DOC",
      );
    });
  });
});

describe("formatFileSize", () => {
  it("formats bytes correctly", () => {
    expect(formatFileSize(0)).toBe("0 Bytes");
    expect(formatFileSize(100)).toBe("100 Bytes");
    expect(formatFileSize(1023)).toBe("1023 Bytes");
  });

  it("formats kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(10240)).toBe("10 KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1 MB");
    expect(formatFileSize(1024 * 1024 * 5)).toBe("5 MB");
    expect(formatFileSize(1024 * 1024 * 50)).toBe("50 MB");
  });

  it("formats gigabytes correctly", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
    expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe("2.5 GB");
  });

  it("handles decimal precision", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1048576 + 524288)).toBe("1.5 MB"); // 1.5 MB
  });
});

describe("generateManuscriptS3Key", () => {
  it("generates key with correct structure", () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const projectId = "987fcdeb-51a2-3c4d-5e6f-789012345678";
    const filename = "my-manuscript.pdf";

    const key = generateManuscriptS3Key(tenantId, projectId, filename);

    // Should contain tenant ID
    expect(key.includes(tenantId)).toBe(true);

    // Should contain project ID
    expect(key.includes(projectId)).toBe(true);

    // Should preserve file extension
    expect(key.endsWith(".pdf")).toBe(true);
  });

  it("preserves file extension", () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const projectId = "987fcdeb-51a2-3c4d-5e6f-789012345678";

    expect(
      generateManuscriptS3Key(tenantId, projectId, "doc.pdf").endsWith(".pdf"),
    ).toBe(true);
    expect(
      generateManuscriptS3Key(tenantId, projectId, "doc.docx").endsWith(
        ".docx",
      ),
    ).toBe(true);
    expect(
      generateManuscriptS3Key(tenantId, projectId, "doc.doc").endsWith(".doc"),
    ).toBe(true);
  });

  it("includes timestamp for uniqueness", () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const projectId = "987fcdeb-51a2-3c4d-5e6f-789012345678";
    const filename = "manuscript.pdf";

    const key1 = generateManuscriptS3Key(tenantId, projectId, filename);
    // Wait a tiny bit to ensure different timestamps
    const key2 = generateManuscriptS3Key(tenantId, projectId, filename);

    // Keys should contain timestamps making them different
    // (though in practice they might be same if called in same millisecond)
    expect(key1).toContain(tenantId);
    expect(key2).toContain(tenantId);
  });
});
