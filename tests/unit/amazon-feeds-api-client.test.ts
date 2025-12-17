import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AmazonCredentials } from "@/modules/channels/adapters/amazon/api-client";
import {
  createFeed,
  createFeedDocument,
  getFeedStatus,
  uploadFeedContent,
} from "@/modules/channels/adapters/amazon/feeds-api-client";

/**
 * Unit tests for Amazon Feeds API Client
 *
 * Story 17.2 - Schedule Automated ONIX Feeds to Amazon
 * AC3: Amazon Feeds API Upload
 * AC5: Feed Status Polling
 */

describe("Amazon Feeds API Client", () => {
  const mockCredentials: AmazonCredentials = {
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    marketplaceId: "ATVPDKIKX0DER",
    region: "us-east-1",
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("createFeedDocument", () => {
    it("returns feed document ID and upload URL on success", async () => {
      const mockResponse = {
        feedDocumentId: "amzn1.tortuga.4.na.xxxxxxxx",
        url: "https://tortuga-prod-na.s3.amazonaws.com/presigned-url",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await createFeedDocument(mockCredentials);

      expect(result.feedDocumentId).toBe("amzn1.tortuga.4.na.xxxxxxxx");
      expect(result.url).toBe(
        "https://tortuga-prod-na.s3.amazonaws.com/presigned-url",
      );
    });

    it("throws error on API failure", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad Request"),
      } as Response);

      await expect(createFeedDocument(mockCredentials)).rejects.toThrow(
        "Failed to create feed document: 400",
      );
    });

    it("throws timeout error on abort", async () => {
      const abortError = new Error("Request aborted");
      abortError.name = "AbortError";

      global.fetch = vi.fn().mockRejectedValueOnce(abortError);

      await expect(createFeedDocument(mockCredentials)).rejects.toThrow(
        "Create feed document timed out after 60 seconds",
      );
    });

    it("includes AWS Signature V4 in authorization header", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ feedDocumentId: "test", url: "test" }),
      } as Response);

      await createFeedDocument(mockCredentials);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/feeds/2021-06-30/documents"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("AWS4-HMAC-SHA256"),
          }),
        }),
      );
    });

    it("sends correct content type in request body", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ feedDocumentId: "test", url: "test" }),
      } as Response);

      await createFeedDocument(mockCredentials);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("text/xml"),
        }),
      );
    });
  });

  describe("uploadFeedContent", () => {
    const uploadUrl = "https://tortuga-prod-na.s3.amazonaws.com/presigned-url";
    const xmlContent = '<?xml version="1.0"?><ONIXMessage></ONIXMessage>';

    it("returns success on successful upload", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await uploadFeedContent(uploadUrl, xmlContent);

      expect(result.success).toBe(true);
    });

    it("returns error on S3 upload failure", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      } as Response);

      const result = await uploadFeedContent(uploadUrl, xmlContent);

      expect(result.success).toBe(false);
      expect(result.message).toContain("S3 upload failed: 403");
    });

    it("returns timeout error on abort", async () => {
      const abortError = new Error("Request aborted");
      abortError.name = "AbortError";

      global.fetch = vi.fn().mockRejectedValueOnce(abortError);

      const result = await uploadFeedContent(uploadUrl, xmlContent);

      expect(result.success).toBe(false);
      expect(result.message).toBe("S3 upload timed out after 60 seconds");
    });

    it("uses PUT method and correct content type", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
      } as Response);

      await uploadFeedContent(uploadUrl, xmlContent);

      expect(global.fetch).toHaveBeenCalledWith(
        uploadUrl,
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "text/xml; charset=UTF-8",
          }),
          body: xmlContent,
        }),
      );
    });
  });

  describe("createFeed", () => {
    const feedDocumentId = "amzn1.tortuga.4.na.xxxxxxxx";

    it("returns feed ID on success", async () => {
      const mockResponse = {
        feedId: "FeedId1234",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await createFeed(mockCredentials, feedDocumentId);

      expect(result.feedId).toBe("FeedId1234");
    });

    it("throws error on API failure", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Invalid feed type"),
      } as Response);

      await expect(createFeed(mockCredentials, feedDocumentId)).rejects.toThrow(
        "Failed to create feed: 400",
      );
    });

    it("includes marketplace ID in request body", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ feedId: "test" }),
      } as Response);

      await createFeed(mockCredentials, feedDocumentId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(mockCredentials.marketplaceId),
        }),
      );
    });

    it("uses POST_PRODUCT_DATA feed type", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ feedId: "test" }),
      } as Response);

      await createFeed(mockCredentials, feedDocumentId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("POST_PRODUCT_DATA"),
        }),
      );
    });
  });

  describe("getFeedStatus", () => {
    const feedId = "FeedId1234";

    it("returns feed status on success", async () => {
      const mockResponse = {
        feedId: "FeedId1234",
        feedType: "POST_PRODUCT_DATA",
        processingStatus: "DONE",
        resultFeedDocumentId: "amzn1.tortuga.4.na.yyyyyyyy",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await getFeedStatus(mockCredentials, feedId);

      expect(result.feedId).toBe("FeedId1234");
      expect(result.processingStatus).toBe("DONE");
      expect(result.resultFeedDocumentId).toBe("amzn1.tortuga.4.na.yyyyyyyy");
    });

    it("parses IN_PROGRESS status correctly", async () => {
      const mockResponse = {
        feedId: "FeedId1234",
        feedType: "POST_PRODUCT_DATA",
        processingStatus: "IN_PROGRESS",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await getFeedStatus(mockCredentials, feedId);

      expect(result.processingStatus).toBe("IN_PROGRESS");
    });

    it("parses IN_QUEUE status correctly", async () => {
      const mockResponse = {
        feedId: "FeedId1234",
        feedType: "POST_PRODUCT_DATA",
        processingStatus: "IN_QUEUE",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await getFeedStatus(mockCredentials, feedId);

      expect(result.processingStatus).toBe("IN_QUEUE");
    });

    it("parses FATAL status correctly", async () => {
      const mockResponse = {
        feedId: "FeedId1234",
        feedType: "POST_PRODUCT_DATA",
        processingStatus: "FATAL",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await getFeedStatus(mockCredentials, feedId);

      expect(result.processingStatus).toBe("FATAL");
    });

    it("parses CANCELLED status correctly", async () => {
      const mockResponse = {
        feedId: "FeedId1234",
        feedType: "POST_PRODUCT_DATA",
        processingStatus: "CANCELLED",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await getFeedStatus(mockCredentials, feedId);

      expect(result.processingStatus).toBe("CANCELLED");
    });

    it("throws error on API failure", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Feed not found"),
      } as Response);

      await expect(getFeedStatus(mockCredentials, feedId)).rejects.toThrow(
        "Failed to get feed status: 404",
      );
    });

    it("calls correct endpoint with feed ID", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            feedId,
            feedType: "POST_PRODUCT_DATA",
            processingStatus: "DONE",
          }),
      } as Response);

      await getFeedStatus(mockCredentials, feedId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/feeds/2021-06-30/feeds/${feedId}`),
        expect.any(Object),
      );
    });
  });
});
