/**
 * ONIX Validation UI Component Tests
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 7: Write tests
 *
 * Tests for ValidationResultsDisplay component.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ValidationResultsDisplay } from "@/modules/onix/components/validation-results";
import type { ValidationResult } from "@/modules/onix/types";

describe("ValidationResultsDisplay", () => {
  describe("valid state (AC: 3)", () => {
    const validResult: ValidationResult = {
      valid: true,
      errors: [],
    };

    it("shows success alert when validation passes", () => {
      render(<ValidationResultsDisplay result={validResult} />);

      expect(screen.getByText("Validation Passed")).toBeInTheDocument();
      expect(
        screen.getByText("ONIX message is valid and ready for export."),
      ).toBeInTheDocument();
    });

    it("shows checkmark icon", () => {
      render(<ValidationResultsDisplay result={validResult} />);

      // CheckCircle2 icon is present
      expect(screen.getByRole("alert")).toHaveClass("border-green-500");
    });
  });

  describe("invalid state (AC: 3)", () => {
    const invalidResult: ValidationResult = {
      valid: false,
      errors: [
        {
          type: "schema",
          code: "XML_MALFORMED",
          message: "Invalid XML structure",
          path: "Line 1",
        },
        {
          type: "business",
          code: "MISSING_TITLE",
          message: "TitleText is required",
          path: "Product[0]/DescriptiveDetail/TitleDetail/TitleElement/TitleText",
        },
      ],
    };

    it("shows failure alert with error count", () => {
      render(<ValidationResultsDisplay result={invalidResult} />);

      expect(screen.getByText("Validation Failed")).toBeInTheDocument();
      expect(
        screen.getByText(
          "2 errors found. Fix issues and re-validate before export.",
        ),
      ).toBeInTheDocument();
    });

    it("displays schema errors section", () => {
      render(<ValidationResultsDisplay result={invalidResult} />);

      expect(screen.getByText("Schema Errors")).toBeInTheDocument();
      expect(screen.getByText("Invalid XML structure")).toBeInTheDocument();
    });

    it("displays business rule errors section", () => {
      render(<ValidationResultsDisplay result={invalidResult} />);

      expect(screen.getByText("Business Rule Errors")).toBeInTheDocument();
      expect(screen.getByText("TitleText is required")).toBeInTheDocument();
    });

    it("shows error paths", () => {
      render(<ValidationResultsDisplay result={invalidResult} />);

      expect(screen.getByText("Line 1")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Product[0]/DescriptiveDetail/TitleDetail/TitleElement/TitleText",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("detailed error display (AC: 3)", () => {
    const errorWithDetails: ValidationResult = {
      valid: false,
      errors: [
        {
          type: "business",
          code: "INVALID_CODELIST",
          message: "Invalid ProductForm value",
          path: "Product[0]/DescriptiveDetail/ProductForm",
          expected: "See List 150",
          actual: "ZZ",
          codelistRef: "List 150",
        },
      ],
    };

    it("shows expected value", () => {
      render(<ValidationResultsDisplay result={errorWithDetails} />);

      expect(screen.getByText(/Expected:/)).toBeInTheDocument();
      expect(screen.getByText("See List 150")).toBeInTheDocument();
    });

    it("shows actual value", () => {
      render(<ValidationResultsDisplay result={errorWithDetails} />);

      expect(screen.getByText(/Actual:/)).toBeInTheDocument();
      expect(screen.getByText("ZZ")).toBeInTheDocument();
    });

    it("shows codelist reference badge", () => {
      render(<ValidationResultsDisplay result={errorWithDetails} />);

      expect(screen.getByText("List 150")).toBeInTheDocument();
    });
  });

  describe("re-validate functionality (AC: 4)", () => {
    const invalidResult: ValidationResult = {
      valid: false,
      errors: [
        {
          type: "schema",
          code: "TEST",
          message: "Test error",
          path: "test",
        },
      ],
    };

    it("shows re-validate button when callback provided", () => {
      const onRevalidate = vi.fn();
      render(
        <ValidationResultsDisplay
          result={invalidResult}
          onRevalidate={onRevalidate}
        />,
      );

      expect(
        screen.getByRole("button", { name: /re-validate/i }),
      ).toBeInTheDocument();
    });

    it("calls onRevalidate when button clicked", () => {
      const onRevalidate = vi.fn();
      render(
        <ValidationResultsDisplay
          result={invalidResult}
          onRevalidate={onRevalidate}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /re-validate/i }));
      expect(onRevalidate).toHaveBeenCalledTimes(1);
    });

    it("does not show re-validate button when no callback", () => {
      render(<ValidationResultsDisplay result={invalidResult} />);

      expect(
        screen.queryByRole("button", { name: /re-validate/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    const validResult: ValidationResult = {
      valid: true,
      errors: [],
    };

    it("shows loading state when isLoading is true", () => {
      render(
        <ValidationResultsDisplay result={validResult} isLoading={true} />,
      );

      expect(screen.getByText("Validating...")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Checking ONIX message against schema and business rules.",
        ),
      ).toBeInTheDocument();
    });

    it("does not show validation result when loading", () => {
      render(
        <ValidationResultsDisplay result={validResult} isLoading={true} />,
      );

      expect(screen.queryByText("Validation Passed")).not.toBeInTheDocument();
    });
  });

  describe("single error grammar", () => {
    const singleErrorResult: ValidationResult = {
      valid: false,
      errors: [
        {
          type: "schema",
          code: "TEST",
          message: "Test error",
          path: "test",
        },
      ],
    };

    it("uses singular 'error' for single error", () => {
      render(<ValidationResultsDisplay result={singleErrorResult} />);

      expect(
        screen.getByText(
          "1 error found. Fix issues and re-validate before export.",
        ),
      ).toBeInTheDocument();
    });
  });
});
