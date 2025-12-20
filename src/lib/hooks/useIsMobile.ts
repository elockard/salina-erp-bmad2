"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if the current viewport is mobile-sized.
 * Uses matchMedia for efficient detection with change listeners.
 *
 * Handles SSR hydration by:
 * 1. Starting with undefined (not yet determined)
 * 2. Setting actual value only after mount
 * 3. Returning false during SSR/initial render for consistent hydration
 *
 * @param breakpoint - Width threshold in pixels (default: 768 for md breakpoint)
 * @returns boolean indicating if viewport is below breakpoint
 *
 * Story 20.4: Mobile-Responsive Layout (AC 20.4.3, AC 20.4.4)
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  // Use undefined initially to detect hydration state
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    // Set initial value after mount (avoids hydration mismatch)
    setIsMobile(mediaQuery.matches);

    // Handler for media query changes
    const handler = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener("change", handler);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [breakpoint]);

  // Return false during SSR and initial render for consistent hydration
  // This means desktop layout is shown first, then switches to mobile if needed
  return isMobile ?? false;
}
