import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AmazonCredentials,
  getRegionForMarketplace,
  testAmazonConnection,
} from "@/modules/channels/adapters/amazon/api-client";

/**
 * Unit tests for Amazon API Client
 *
 * Story 17.1 - AC3: Connection Testing
 */

describe("getRegionForMarketplace", () => {
  it("returns us-east-1 for US marketplace", () => {
    expect(getRegionForMarketplace("US")).toBe("us-east-1");
  });

  it("returns us-east-1 for CA marketplace", () => {
    expect(getRegionForMarketplace("CA")).toBe("us-east-1");
  });

  it("returns eu-west-1 for UK marketplace", () => {
    expect(getRegionForMarketplace("UK")).toBe("eu-west-1");
  });

  it("returns eu-west-1 for DE marketplace", () => {
    expect(getRegionForMarketplace("DE")).toBe("eu-west-1");
  });

  it("returns eu-west-1 for FR marketplace", () => {
    expect(getRegionForMarketplace("FR")).toBe("eu-west-1");
  });

  it("returns eu-west-1 for ES marketplace", () => {
    expect(getRegionForMarketplace("ES")).toBe("eu-west-1");
  });

  it("returns eu-west-1 for IT marketplace", () => {
    expect(getRegionForMarketplace("IT")).toBe("eu-west-1");
  });

  it("returns us-west-2 for JP marketplace", () => {
    expect(getRegionForMarketplace("JP")).toBe("us-west-2");
  });

  it("returns us-west-2 for AU marketplace", () => {
    expect(getRegionForMarketplace("AU")).toBe("us-west-2");
  });
});

describe("testAmazonConnection", () => {
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

  it("returns success with seller name on successful connection", async () => {
    const mockResponse = {
      payload: [
        {
          marketplace: { id: "ATVPDKIKX0DER", name: "Amazon.com" },
          seller: { sellerName: "Test Publisher Inc" },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await testAmazonConnection(mockCredentials);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Connection successful");
    expect(result.sellerName).toBe("Test Publisher Inc");
    expect(result.marketplaceName).toBe("Amazon.com");
  });

  it("returns error message on API error response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden: Invalid credentials"),
    } as Response);

    const result = await testAmazonConnection(mockCredentials);

    expect(result.success).toBe(false);
    expect(result.message).toContain("API Error 403");
    expect(result.message).toContain("Forbidden");
  });

  it("returns timeout message when connection times out", async () => {
    // Create an abort error
    const abortError = new Error("Request was aborted");
    abortError.name = "AbortError";

    global.fetch = vi.fn().mockRejectedValueOnce(abortError);

    const result = await testAmazonConnection(mockCredentials);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Connection timed out after 15 seconds");
  });

  it("returns error message on network failure", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    const result = await testAmazonConnection(mockCredentials);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Network error");
  });

  it("returns unknown error for non-Error exceptions", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce("string error");

    const result = await testAmazonConnection(mockCredentials);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Unknown connection error");
  });

  it("handles response with no matching marketplace", async () => {
    const mockResponse = {
      payload: [
        {
          marketplace: { id: "OTHER_ID", name: "Other Marketplace" },
          seller: { sellerName: "Test Publisher" },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await testAmazonConnection(mockCredentials);

    expect(result.success).toBe(true);
    expect(result.sellerName).toBe("Unknown Seller");
    expect(result.marketplaceName).toBe("Unknown Marketplace");
  });

  it("uses correct SP-API endpoint based on region", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ payload: [] }),
    } as Response);

    await testAmazonConnection(mockCredentials);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("sellingpartnerapi-na.amazon.com"),
      expect.any(Object),
    );
  });

  it("includes Authorization header with AWS Signature V4", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ payload: [] }),
    } as Response);

    await testAmazonConnection(mockCredentials);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("AWS4-HMAC-SHA256"),
        }),
      }),
    );
  });
});
