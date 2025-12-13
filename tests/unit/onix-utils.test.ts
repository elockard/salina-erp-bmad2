/**
 * ONIX Utility Functions Tests
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 * Task 1: Create ONIX module structure
 *
 * Tests for XML escaping and null-safe element builder utilities.
 */

import { describe, expect, it } from "vitest";
import {
  escapeXML,
  formatPublishingDate,
  formatSentDateTime,
  optionalElement,
} from "@/modules/onix/builder/utils/xml-escape";

describe("escapeXML", () => {
  it("escapes ampersand", () => {
    expect(escapeXML("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes less than", () => {
    expect(escapeXML("a < b")).toBe("a &lt; b");
  });

  it("escapes greater than", () => {
    expect(escapeXML("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes", () => {
    expect(escapeXML('He said "hello"')).toBe("He said &quot;hello&quot;");
  });

  it("escapes single quotes (apostrophe)", () => {
    expect(escapeXML("Jerry's")).toBe("Jerry&apos;s");
  });

  it("escapes multiple special characters in one string", () => {
    expect(escapeXML("Tom & Jerry's <Adventures>")).toBe(
      "Tom &amp; Jerry&apos;s &lt;Adventures&gt;",
    );
  });

  it("returns empty string for empty input", () => {
    expect(escapeXML("")).toBe("");
  });

  it("returns same string when no special characters", () => {
    expect(escapeXML("Hello World")).toBe("Hello World");
  });

  it("handles unicode characters without escaping", () => {
    expect(escapeXML("Café résumé")).toBe("Café résumé");
  });
});

describe("optionalElement", () => {
  it("returns properly escaped element when value is provided", () => {
    expect(optionalElement("Title", "The Great Gatsby")).toBe(
      "<Title>The Great Gatsby</Title>",
    );
  });

  it("returns empty string when value is null", () => {
    expect(optionalElement("Subtitle", null)).toBe("");
  });

  it("returns empty string when value is undefined", () => {
    expect(optionalElement("Subtitle", undefined)).toBe("");
  });

  it("returns empty string when value is empty string", () => {
    expect(optionalElement("Subtitle", "")).toBe("");
  });

  it("returns empty string when value is whitespace only", () => {
    expect(optionalElement("Subtitle", "   ")).toBe("");
  });

  it("escapes special characters in value", () => {
    expect(optionalElement("Title", "Tom & Jerry's <Adventures>")).toBe(
      "<Title>Tom &amp; Jerry&apos;s &lt;Adventures&gt;</Title>",
    );
  });

  it("does NOT output empty tags", () => {
    const result = optionalElement("Subtitle", null);
    expect(result).not.toContain("<Subtitle></Subtitle>");
    expect(result).not.toContain("<Subtitle/>");
  });
});

describe("formatSentDateTime", () => {
  it("formats date to ONIX SentDateTime format", () => {
    const date = new Date("2025-12-12T12:00:00.000Z");
    expect(formatSentDateTime(date)).toBe("20251212T120000Z");
  });

  it("includes leading zeros for single digit values", () => {
    const date = new Date("2025-01-05T09:05:03.000Z");
    expect(formatSentDateTime(date)).toBe("20250105T090503Z");
  });
});

describe("formatPublishingDate", () => {
  it("formats date to ONIX YYYYMMDD format", () => {
    const date = new Date("2025-12-01T00:00:00.000Z");
    expect(formatPublishingDate(date)).toBe("20251201");
  });

  it("includes leading zeros for single digit months and days", () => {
    const date = new Date("2025-01-05T00:00:00.000Z");
    expect(formatPublishingDate(date)).toBe("20250105");
  });
});
