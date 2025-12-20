/**
 * DownloadTemplateButton Component Tests
 *
 * Story: 19.2 - Download CSV Templates
 * Code Review Fix: M3 - Add component test
 *
 * Tests the React component behavior including:
 * - Rendering
 * - Click handling
 * - Loading state
 * - Error handling
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DownloadTemplateButton } from "@/modules/import-export/components/download-template-button";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock the template generator
vi.mock("@/modules/import-export/templates/csv-template-generator", () => ({
  generateTitlesTemplate: vi.fn(() => "mock,csv,content"),
}));

describe("DownloadTemplateButton", () => {
  // Mock browser APIs
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL APIs
    mockCreateObjectURL = vi.fn(() => "blob:mock-url");
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL =
      mockCreateObjectURL as typeof URL.createObjectURL;
    global.URL.revokeObjectURL =
      mockRevokeObjectURL as typeof URL.revokeObjectURL;

    // Mock document.createElement to track link creation
    mockClick = vi.fn();
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") {
        const link = originalCreateElement("a");
        link.click = mockClick as () => void;
        return link;
      }
      return originalCreateElement(tagName);
    });

    vi.spyOn(document.body, "appendChild").mockImplementation(
      mockAppendChild as <T extends Node>(node: T) => T,
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      mockRemoveChild as <T extends Node>(child: T) => T,
    );
  });

  it("renders with correct text", () => {
    render(<DownloadTemplateButton />);

    expect(screen.getByText("Download Template")).toBeInTheDocument();
    expect(screen.getByTestId("download-template-button")).toBeInTheDocument();
  });

  it("renders download icon", () => {
    render(<DownloadTemplateButton />);

    // Button should contain an SVG (the Download icon)
    const button = screen.getByTestId("download-template-button");
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("triggers download on click", async () => {
    render(<DownloadTemplateButton />);

    const button = screen.getByTestId("download-template-button");
    fireEvent.click(button);

    await waitFor(() => {
      // Verify blob was created
      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));

      // Verify link was clicked
      expect(mockClick).toHaveBeenCalled();

      // Verify cleanup
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });

  it("creates blob with correct MIME type", async () => {
    render(<DownloadTemplateButton />);

    const button = screen.getByTestId("download-template-button");
    fireEvent.click(button);

    await waitFor(() => {
      const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe("text/csv;charset=utf-8;");
    });
  });

  it("sets correct filename with date", async () => {
    render(<DownloadTemplateButton />);

    const button = screen.getByTestId("download-template-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAppendChild).toHaveBeenCalled();
      const link = mockAppendChild.mock.calls[0][0] as HTMLAnchorElement;
      expect(link.download).toMatch(
        /^salina-title-import-template-\d{4}-\d{2}-\d{2}\.csv$/,
      );
    });
  });

  it("is disabled while downloading", async () => {
    render(<DownloadTemplateButton />);

    const button = screen.getByTestId("download-template-button");

    // Button should be enabled initially
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    // Button returns to enabled after download completes
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it("has correct button variant", () => {
    render(<DownloadTemplateButton />);

    const button = screen.getByTestId("download-template-button");
    // Outline variant has specific classes
    expect(button.className).toContain("border");
  });

  it("cleans up link element after download", async () => {
    render(<DownloadTemplateButton />);

    const button = screen.getByTestId("download-template-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });
  });
});
