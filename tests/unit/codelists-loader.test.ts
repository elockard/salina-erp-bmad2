/**
 * Codelists Loader Tests
 *
 * Story: 14.4 - Build Codelist Management System
 * Task 2.7: Write loader tests with mocked responses
 *
 * Tests for EDItEUR codelist loading and parsing.
 */

import { describe, expect, it } from "vitest";

import {
  BUNDLED_ISSUE_NUMBER,
  parseCodelistJSON,
} from "@/modules/onix/codelists/loader";
import type { EditeurCodelistJSON } from "@/modules/onix/codelists/types";
import { REQUIRED_CODELISTS } from "@/modules/onix/codelists/types";

describe("codelists loader", () => {
  describe("parseCodelistJSON", () => {
    it("parses valid EDItEUR JSON format", () => {
      const json: EditeurCodelistJSON = {
        CodeListNumber: "196",
        IssueNumber: 68,
        ListName: "E-publication accessibility details",
        Codes: [
          {
            CodeValue: "00",
            CodeDescription: "Accessibility summary",
            CodeNotes: "Summary text",
            IssueNumber: 51,
          },
          {
            CodeValue: "01",
            CodeDescription: "LIA Compliance Scheme",
          },
        ],
      };

      const result = parseCodelistJSON(json);

      expect(result.listNumber).toBe(196);
      expect(result.issueNumber).toBe(68);
      expect(result.listName).toBe("E-publication accessibility details");
      expect(result.entries).toHaveLength(2);
    });

    it("extracts code value correctly", () => {
      const json: EditeurCodelistJSON = {
        CodeListNumber: "17",
        IssueNumber: 68,
        ListName: "Contributor role code",
        Codes: [
          {
            CodeValue: "A01",
            CodeDescription: "Written by",
          },
        ],
      };

      const result = parseCodelistJSON(json);

      expect(result.entries[0].code).toBe("A01");
      expect(result.entries[0].description).toBe("Written by");
    });

    it("extracts description correctly", () => {
      const json: EditeurCodelistJSON = {
        CodeListNumber: "150",
        IssueNumber: 68,
        ListName: "Product form",
        Codes: [
          {
            CodeValue: "BC",
            CodeDescription: "Paperback / softback",
          },
        ],
      };

      const result = parseCodelistJSON(json);

      expect(result.entries[0].description).toBe("Paperback / softback");
    });

    it("handles optional notes field", () => {
      const json: EditeurCodelistJSON = {
        CodeListNumber: "5",
        IssueNumber: 68,
        ListName: "Product identifier type",
        Codes: [
          {
            CodeValue: "15",
            CodeDescription: "ISBN-13",
            CodeNotes: "International Standard Book Number, 13-digit",
          },
        ],
      };

      const result = parseCodelistJSON(json);

      expect(result.entries[0].notes).toBe(
        "International Standard Book Number, 13-digit",
      );
    });

    it("handles missing notes field", () => {
      const json: EditeurCodelistJSON = {
        CodeListNumber: "5",
        IssueNumber: 68,
        ListName: "Product identifier type",
        Codes: [
          {
            CodeValue: "15",
            CodeDescription: "ISBN-13",
          },
        ],
      };

      const result = parseCodelistJSON(json);

      expect(result.entries[0].notes).toBeUndefined();
    });

    it("extracts addedInIssue from IssueNumber", () => {
      const json: EditeurCodelistJSON = {
        CodeListNumber: "196",
        IssueNumber: 68,
        ListName: "E-publication accessibility details",
        Codes: [
          {
            CodeValue: "09",
            CodeDescription: "EPUB Accessibility 1.1 + WCAG 2.2 Level A",
            IssueNumber: 65,
          },
        ],
      };

      const result = parseCodelistJSON(json);

      expect(result.entries[0].addedInIssue).toBe(65);
    });

    it("handles deprecated codes", () => {
      const json: EditeurCodelistJSON = {
        CodeListNumber: "17",
        IssueNumber: 68,
        ListName: "Contributor role code",
        Codes: [
          {
            CodeValue: "Z99",
            CodeDescription: "Deprecated role",
            Deprecated: "true",
          },
        ],
      };

      const result = parseCodelistJSON(json);

      expect(result.entries[0].deprecated).toBe(true);
    });

    it("defaults deprecated to false when not specified", () => {
      const json: EditeurCodelistJSON = {
        CodeListNumber: "17",
        IssueNumber: 68,
        ListName: "Contributor role code",
        Codes: [
          {
            CodeValue: "A01",
            CodeDescription: "Written by",
          },
        ],
      };

      const result = parseCodelistJSON(json);

      expect(result.entries[0].deprecated).toBe(false);
    });

    it("handles empty codes array", () => {
      const json: EditeurCodelistJSON = {
        CodeListNumber: "999",
        IssueNumber: 68,
        ListName: "Empty list",
        Codes: [],
      };

      const result = parseCodelistJSON(json);

      expect(result.entries).toHaveLength(0);
    });

    it("parses list number from string correctly", () => {
      const json: EditeurCodelistJSON = {
        CodeListNumber: "27",
        IssueNumber: 68,
        ListName: "Subject scheme identifier code",
        Codes: [],
      };

      const result = parseCodelistJSON(json);

      expect(result.listNumber).toBe(27);
      expect(typeof result.listNumber).toBe("number");
    });
  });

  describe("REQUIRED_CODELISTS", () => {
    it("includes List 5 (Product Identifier Type)", () => {
      expect(REQUIRED_CODELISTS).toContain(5);
    });

    it("includes List 15 (Title Type)", () => {
      expect(REQUIRED_CODELISTS).toContain(15);
    });

    it("includes List 17 (Contributor Role)", () => {
      expect(REQUIRED_CODELISTS).toContain(17);
    });

    it("includes List 27 (Subject Scheme)", () => {
      expect(REQUIRED_CODELISTS).toContain(27);
    });

    it("includes List 150 (Product Form)", () => {
      expect(REQUIRED_CODELISTS).toContain(150);
    });

    it("includes List 196 (Accessibility)", () => {
      expect(REQUIRED_CODELISTS).toContain(196);
    });

    it("has exactly 6 required codelists", () => {
      expect(REQUIRED_CODELISTS).toHaveLength(6);
    });
  });

  describe("BUNDLED_ISSUE_NUMBER", () => {
    it("is Issue 68 (January 2025)", () => {
      expect(BUNDLED_ISSUE_NUMBER).toBe(68);
    });
  });
});
