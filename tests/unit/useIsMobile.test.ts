/**
 * Tests for useIsMobile hook
 * Story 20.4: Mobile-Responsive Layout
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

describe("useIsMobile", () => {
  // Store original matchMedia
  const originalMatchMedia = window.matchMedia;

  // Mock matchMedia
  let mockMatches = false;
  let mockListeners: ((event: MediaQueryListEvent) => void)[] = [];

  beforeEach(() => {
    mockMatches = false;
    mockListeners = [];

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: mockMatches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn((_, handler) => {
        mockListeners.push(handler);
      }),
      removeEventListener: vi.fn((_, handler) => {
        mockListeners = mockListeners.filter((l) => l !== handler);
      }),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("returns false when viewport is above breakpoint", () => {
    mockMatches = false;

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("returns true when viewport is below breakpoint", () => {
    mockMatches = true;

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("uses default breakpoint of 768px", () => {
    renderHook(() => useIsMobile());

    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
  });

  it("accepts custom breakpoint", () => {
    renderHook(() => useIsMobile(1024));

    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 1023px)");
  });

  it("updates when media query changes", () => {
    mockMatches = false;
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate viewport resize below breakpoint
    act(() => {
      mockListeners.forEach((listener) => {
        listener({ matches: true } as MediaQueryListEvent);
      });
    });

    expect(result.current).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    const { unmount } = renderHook(() => useIsMobile());

    const mockRemove = (window.matchMedia("") as MediaQueryList)
      .removeEventListener;

    unmount();

    expect(mockRemove).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
