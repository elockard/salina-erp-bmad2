/**
 * Unit Tests: Amazon Reports API Client
 *
 * Story 17.3 - Import Amazon Sales Data
 * Task 1: Create Amazon Reports API client
 *
 * Tests AC1 (Request Reports), AC2 (Poll for Completion), AC3 (Download/Parse)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AmazonCredentials } from "@/modules/channels/adapters/amazon/api-client";
import {
  createReport,
  downloadReportContent,
  getReportDocument,
  getReportStatus,
  pollReportCompletion,
  type ReportDocument,
  SALES_REPORT_TYPE,
} from "@/modules/channels/adapters/amazon/reports-api-client";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Amazon Reports API Client", () => {
  const mockCredentials: AmazonCredentials = {
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    marketplaceId: "ATVPDKIKX0DER",
    region: "us-east-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createReport", () => {
    it("returns reportId on success - AC1", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reportId: "ID12345" }),
      });

      const result = await createReport(
        mockCredentials,
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      expect(result.reportId).toBe("ID12345");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify request body
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/reports/2021-06-30/reports");
      const body = JSON.parse(options.body);
      expect(body.reportType).toBe(SALES_REPORT_TYPE);
      expect(body.marketplaceIds).toContain("ATVPDKIKX0DER");
    });

    it("uses correct report type - AC1", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reportId: "ID12345" }),
      });

      await createReport(
        mockCredentials,
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.reportType).toBe(
        "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL",
      );
    });

    it("throws error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      await expect(
        createReport(
          mockCredentials,
          new Date("2024-01-01"),
          new Date("2024-01-31"),
        ),
      ).rejects.toThrow("Failed to create report: 400");
    });
  });

  describe("getReportStatus", () => {
    it("parses DONE status correctly - AC2", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportId: "ID12345",
          reportType: SALES_REPORT_TYPE,
          processingStatus: "DONE",
          reportDocumentId: "amzn1.tortuga.document.12345",
        }),
      });

      const status = await getReportStatus(mockCredentials, "ID12345");

      expect(status.processingStatus).toBe("DONE");
      expect(status.reportDocumentId).toBe("amzn1.tortuga.document.12345");
    });

    it("parses IN_PROGRESS status correctly - AC2", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportId: "ID12345",
          reportType: SALES_REPORT_TYPE,
          processingStatus: "IN_PROGRESS",
        }),
      });

      const status = await getReportStatus(mockCredentials, "ID12345");

      expect(status.processingStatus).toBe("IN_PROGRESS");
      expect(status.reportDocumentId).toBeUndefined();
    });

    it("parses CANCELLED status correctly - AC2", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportId: "ID12345",
          reportType: SALES_REPORT_TYPE,
          processingStatus: "CANCELLED",
        }),
      });

      const status = await getReportStatus(mockCredentials, "ID12345");

      expect(status.processingStatus).toBe("CANCELLED");
    });

    it("parses FATAL status correctly - AC2", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportId: "ID12345",
          reportType: SALES_REPORT_TYPE,
          processingStatus: "FATAL",
        }),
      });

      const status = await getReportStatus(mockCredentials, "ID12345");

      expect(status.processingStatus).toBe("FATAL");
    });

    it("parses IN_QUEUE status correctly - AC2", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportId: "ID12345",
          reportType: SALES_REPORT_TYPE,
          processingStatus: "IN_QUEUE",
        }),
      });

      const status = await getReportStatus(mockCredentials, "ID12345");

      expect(status.processingStatus).toBe("IN_QUEUE");
    });
  });

  describe("getReportDocument", () => {
    it("returns download URL and compression info - AC3", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportDocumentId: "amzn1.tortuga.document.12345",
          url: "https://tortuga-prod-na.s3.amazonaws.com/12345",
          compressionAlgorithm: "GZIP",
        }),
      });

      const doc = await getReportDocument(
        mockCredentials,
        "amzn1.tortuga.document.12345",
      );

      expect(doc.url).toBe("https://tortuga-prod-na.s3.amazonaws.com/12345");
      expect(doc.compressionAlgorithm).toBe("GZIP");
    });

    it("returns document without compression - AC3", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportDocumentId: "amzn1.tortuga.document.12345",
          url: "https://tortuga-prod-na.s3.amazonaws.com/12345",
        }),
      });

      const doc = await getReportDocument(
        mockCredentials,
        "amzn1.tortuga.document.12345",
      );

      expect(doc.compressionAlgorithm).toBeUndefined();
    });
  });

  describe("downloadReportContent", () => {
    it("handles plain text content - AC3", async () => {
      const csvContent = "order-id\tpurchase-date\tasin\n123\t2024-01-15\tB001";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Buffer.from(csvContent),
      });

      const document: ReportDocument = {
        reportDocumentId: "doc123",
        url: "https://example.com/report",
      };

      const content = await downloadReportContent(document);

      expect(content).toBe(csvContent);
    });

    it("handles GZIP compressed content - AC3", async () => {
      const { gzipSync } = await import("node:zlib");
      const csvContent = "order-id\tpurchase-date\tasin\n123\t2024-01-15\tB001";
      const compressed = gzipSync(Buffer.from(csvContent));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => compressed,
      });

      const document: ReportDocument = {
        reportDocumentId: "doc123",
        url: "https://example.com/report",
        compressionAlgorithm: "GZIP",
      };

      const content = await downloadReportContent(document);

      expect(content).toBe(csvContent);
    });

    it("throws error on download failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const document: ReportDocument = {
        reportDocumentId: "doc123",
        url: "https://example.com/report",
      };

      await expect(downloadReportContent(document)).rejects.toThrow(
        "Failed to download report: 404",
      );
    });
  });

  describe("pollReportCompletion", () => {
    it("returns immediately when status is DONE - AC2", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportId: "ID12345",
          reportType: SALES_REPORT_TYPE,
          processingStatus: "DONE",
          reportDocumentId: "doc123",
        }),
      });

      const status = await pollReportCompletion(mockCredentials, "ID12345");

      expect(status.processingStatus).toBe("DONE");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("returns immediately when status is CANCELLED - AC2", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportId: "ID12345",
          reportType: SALES_REPORT_TYPE,
          processingStatus: "CANCELLED",
        }),
      });

      const status = await pollReportCompletion(mockCredentials, "ID12345");

      expect(status.processingStatus).toBe("CANCELLED");
    });

    it("returns immediately when status is FATAL - AC2", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportId: "ID12345",
          reportType: SALES_REPORT_TYPE,
          processingStatus: "FATAL",
        }),
      });

      const status = await pollReportCompletion(mockCredentials, "ID12345");

      expect(status.processingStatus).toBe("FATAL");
    });

    it("polls until DONE - AC2", async () => {
      // First call: IN_PROGRESS
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportId: "ID12345",
          reportType: SALES_REPORT_TYPE,
          processingStatus: "IN_PROGRESS",
        }),
      });

      // Second call: DONE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reportId: "ID12345",
          reportType: SALES_REPORT_TYPE,
          processingStatus: "DONE",
          reportDocumentId: "doc123",
        }),
      });

      const pollPromise = pollReportCompletion(mockCredentials, "ID12345", {
        pollIntervalMs: 100,
        maxWaitMs: 5000,
      });

      // Advance time to trigger next poll
      await vi.advanceTimersByTimeAsync(100);

      const status = await pollPromise;

      expect(status.processingStatus).toBe("DONE");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("times out after maxWaitMs - AC2", async () => {
      // Always return IN_PROGRESS
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          reportId: "ID12345",
          reportType: SALES_REPORT_TYPE,
          processingStatus: "IN_PROGRESS",
        }),
      });

      const pollPromise = pollReportCompletion(mockCredentials, "ID12345", {
        pollIntervalMs: 100,
        maxWaitMs: 500,
      });

      // Advance time past maxWaitMs
      await vi.advanceTimersByTimeAsync(600);

      await expect(pollPromise).rejects.toThrow("timed out");
    });
  });

  describe("AWS Signature V4 headers", () => {
    it("includes Authorization header in requests", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reportId: "ID12345" }),
      });

      await createReport(
        mockCredentials,
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toContain("AWS4-HMAC-SHA256");
      expect(options.headers.Authorization).toContain("Credential=");
      expect(options.headers.Authorization).toContain("Signature=");
    });

    it("includes x-amz-date header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reportId: "ID12345" }),
      });

      await createReport(
        mockCredentials,
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["x-amz-date"]).toMatch(/^\d{8}T\d{6}Z$/);
    });
  });
});
