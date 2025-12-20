/**
 * BisacSelector Component Tests
 *
 * Story 19.5: BISAC Code Suggestions (FR175)
 * Task 11: Write tests for BISAC functionality
 *
 * Tests:
 * - Renders correctly with empty value
 * - Displays suggestions based on title
 * - Allows selecting codes up to max limit
 * - Removes codes on click
 * - Shows search results
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BisacSelector } from "@/modules/import-export/components/bisac-selector";

// Mock the BISAC functions
vi.mock("@/modules/import-export/bisac", () => ({
  MAX_BISAC_CODES: 3,
  suggestBisacCodes: vi.fn(({ title }) => {
    if (title?.toLowerCase().includes("mystery")) {
      return [
        {
          code: "FIC022000",
          description: "FICTION / Mystery & Detective / General",
          confidence: 85,
          matchedKeywords: ["mystery"],
        },
        {
          code: "FIC022020",
          description: "FICTION / Mystery & Detective / Cozy",
          confidence: 60,
          matchedKeywords: ["mystery"],
        },
      ];
    }
    if (title?.toLowerCase().includes("history")) {
      return [
        {
          code: "HIS000000",
          description: "HISTORY / General",
          confidence: 75,
          matchedKeywords: ["history"],
        },
      ];
    }
    return [];
  }),
  searchBisacCodes: vi.fn((query) => {
    if (query.toLowerCase().includes("fic")) {
      return [
        {
          code: "FIC000000",
          description: "FICTION / General",
          confidence: 100,
          matchedKeywords: [],
        },
        {
          code: "FIC022000",
          description: "FICTION / Mystery & Detective / General",
          confidence: 90,
          matchedKeywords: [],
        },
      ];
    }
    return [];
  }),
}));

describe("BisacSelector", () => {
  it("renders with empty value and placeholder", () => {
    const onChange = vi.fn();
    render(
      <BisacSelector
        value={[]}
        onChange={onChange}
        placeholder="Select BISAC codes..."
      />,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Select BISAC codes...")).toBeInTheDocument();
  });

  it("shows selected codes as badges", () => {
    const onChange = vi.fn();
    render(
      <BisacSelector value={["FIC000000", "FIC022000"]} onChange={onChange} />,
    );

    expect(screen.getByText("FIC000000")).toBeInTheDocument();
    expect(screen.getByText("FIC022000")).toBeInTheDocument();
    expect(screen.getByText("(primary)")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 codes selected")).toBeInTheDocument();
  });

  it("disables selector when max codes reached", () => {
    const onChange = vi.fn();
    render(
      <BisacSelector
        value={["FIC000000", "FIC022000", "HIS000000"]}
        onChange={onChange}
      />,
    );

    const combobox = screen.getByRole("combobox");
    expect(combobox).toBeDisabled();
    expect(screen.getByText("Maximum 3 codes selected")).toBeInTheDocument();
  });

  it("calls onChange when code is removed", async () => {
    const onChange = vi.fn();
    render(
      <BisacSelector value={["FIC000000", "FIC022000"]} onChange={onChange} />,
    );

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(["FIC022000"]);
  });

  it("shows suggestions when title is provided", async () => {
    const onChange = vi.fn();
    render(
      <BisacSelector value={[]} onChange={onChange} title="A Mystery Novel" />,
    );

    // Open the popover
    fireEvent.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("Suggestions")).toBeInTheDocument();
      expect(screen.getByText("FIC022000")).toBeInTheDocument();
      expect(screen.getByText("85%")).toBeInTheDocument();
    });
  });

  it("calls onChange when suggestion is selected", async () => {
    const onChange = vi.fn();
    render(
      <BisacSelector value={[]} onChange={onChange} title="A Mystery Novel" />,
    );

    // Open the popover
    fireEvent.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("FIC022000")).toBeInTheDocument();
    });

    // Click on the suggestion
    const option = screen.getByText("FIC022000");
    fireEvent.click(option.closest("div[role='option']") || option);

    expect(onChange).toHaveBeenCalledWith(["FIC022000"]);
  });

  it("respects disabled prop", () => {
    const onChange = vi.fn();
    render(<BisacSelector value={[]} onChange={onChange} disabled />);

    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("shows description for selected codes", () => {
    const onChange = vi.fn();
    render(
      <BisacSelector
        value={["FIC022000"]}
        onChange={onChange}
        title="A Mystery Novel"
      />,
    );

    // The description should show below selected codes
    expect(screen.getByText(/FIC022000:/)).toBeInTheDocument();
  });

  it("handles empty title gracefully", async () => {
    const onChange = vi.fn();
    render(<BisacSelector value={[]} onChange={onChange} title="" />);

    fireEvent.click(screen.getByRole("combobox"));

    await waitFor(() => {
      // Should show hint when no suggestions
      expect(
        screen.getByText(/Enter title information for suggestions/),
      ).toBeInTheDocument();
    });
  });
});
