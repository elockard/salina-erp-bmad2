/**
 * Unit Tests: ONIX ProductAvailability Codelist 65 Mapping
 *
 * Story 16.4 - AC1: Dynamic ProductAvailability in ONIX Export
 *
 * Tests the getProductAvailabilityCode function and ONIXMessageBuilder
 * integration with dynamic ProductAvailability based on title status.
 */

import { describe, expect, it } from "vitest";
import {
  getProductAvailabilityCode,
  ONIXMessageBuilder,
} from "@/modules/onix/builder/message-builder";

describe("getProductAvailabilityCode", () => {
  describe("returns correct Codelist 65 codes", () => {
    it("returns '10' (Not yet available) for draft status", () => {
      expect(getProductAvailabilityCode("draft")).toBe("10");
    });

    it("returns '10' (Not yet available) for pending status", () => {
      expect(getProductAvailabilityCode("pending")).toBe("10");
    });

    it("returns '20' (Available) for published status", () => {
      expect(getProductAvailabilityCode("published")).toBe("20");
    });

    it("returns '40' (Not available) for out_of_print status", () => {
      expect(getProductAvailabilityCode("out_of_print")).toBe("40");
    });

    it("returns '20' (Available) for null status", () => {
      expect(getProductAvailabilityCode(null)).toBe("20");
    });

    it("returns '20' (Available) for unknown status", () => {
      expect(getProductAvailabilityCode("unknown_status")).toBe("20");
    });

    it("returns '20' (Available) for empty string", () => {
      expect(getProductAvailabilityCode("")).toBe("20");
    });
  });
});

describe("ONIXMessageBuilder ProductAvailability integration", () => {
  const mockTenant = {
    id: "tenant-123",
    name: "Test Publisher",
    subdomain: "test-pub",
    default_currency: "USD",
  };

  const createMockTitle = (publicationStatus: string | null) => ({
    id: "title-456",
    title: "Test Book",
    subtitle: null,
    isbn: "9781234567890",
    tenant_id: "tenant-123",
    publication_status: publicationStatus,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
    authors: [],
    primaryAuthor: null,
    isSoleAuthor: false,
    epub_accessibility_conformance: null,
    accessibility_features: null,
    accessibility_hazards: null,
    accessibility_summary: null,
  });

  it("generates ProductAvailability 10 for draft title", () => {
    const builder = new ONIXMessageBuilder("tenant-123", mockTenant, "3.1");
    builder.addTitle(createMockTitle("draft"));
    const xml = builder.toXML();

    expect(xml).toContain("<ProductAvailability>10</ProductAvailability>");
  });

  it("generates ProductAvailability 10 for pending title", () => {
    const builder = new ONIXMessageBuilder("tenant-123", mockTenant, "3.1");
    builder.addTitle(createMockTitle("pending"));
    const xml = builder.toXML();

    expect(xml).toContain("<ProductAvailability>10</ProductAvailability>");
  });

  it("generates ProductAvailability 20 for published title", () => {
    const builder = new ONIXMessageBuilder("tenant-123", mockTenant, "3.1");
    builder.addTitle(createMockTitle("published"));
    const xml = builder.toXML();

    expect(xml).toContain("<ProductAvailability>20</ProductAvailability>");
  });

  it("generates ProductAvailability 40 for out_of_print title", () => {
    const builder = new ONIXMessageBuilder("tenant-123", mockTenant, "3.1");
    builder.addTitle(createMockTitle("out_of_print"));
    const xml = builder.toXML();

    expect(xml).toContain("<ProductAvailability>40</ProductAvailability>");
  });

  it("generates ProductAvailability 20 for null status (default)", () => {
    const builder = new ONIXMessageBuilder("tenant-123", mockTenant, "3.1");
    builder.addTitle(createMockTitle(null));
    const xml = builder.toXML();

    expect(xml).toContain("<ProductAvailability>20</ProductAvailability>");
  });

  it("correctly handles multiple titles with different statuses", () => {
    const builder = new ONIXMessageBuilder("tenant-123", mockTenant, "3.1");
    builder.addTitle({
      ...createMockTitle("draft"),
      id: "title-1",
    });
    builder.addTitle({
      ...createMockTitle("published"),
      id: "title-2",
    });
    builder.addTitle({
      ...createMockTitle("out_of_print"),
      id: "title-3",
    });
    const xml = builder.toXML();

    // Should contain both codes - count occurrences
    const availability10 = (
      xml.match(/<ProductAvailability>10<\/ProductAvailability>/g) || []
    ).length;
    const availability20 = (
      xml.match(/<ProductAvailability>20<\/ProductAvailability>/g) || []
    ).length;
    const availability40 = (
      xml.match(/<ProductAvailability>40<\/ProductAvailability>/g) || []
    ).length;

    expect(availability10).toBe(1); // draft
    expect(availability20).toBe(1); // published
    expect(availability40).toBe(1); // out_of_print
  });

  it("works with ONIX 3.0 version", () => {
    const builder = new ONIXMessageBuilder("tenant-123", mockTenant, "3.0");
    builder.addTitle(createMockTitle("out_of_print"));
    const xml = builder.toXML();

    expect(xml).toContain("<ProductAvailability>40</ProductAvailability>");
    expect(xml).toContain('release="3.0"');
  });
});
