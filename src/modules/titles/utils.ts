/**
 * Title Utility Functions
 *
 * Story 14.3 - AC5, AC6: Accessibility status tracking utilities
 */

/**
 * Accessibility metadata structure for utility functions
 */
export interface AccessibilityCheckData {
  epub_accessibility_conformance: string | null;
  accessibility_features?: string[] | null;
  accessibility_hazards?: string[] | null;
  accessibility_summary?: string | null;
}

/**
 * Accessibility compliance status
 */
export type AccessibilityStatus = "complete" | "partial" | "missing";

/**
 * Check if a title has minimum accessibility metadata for EAA compliance
 *
 * Story 14.3 - AC6: EAA compliance warning for missing metadata
 *
 * A title has "minimum accessibility metadata" when:
 * - epub_accessibility_conformance is set to any value OTHER than "00" (No information) or null
 *
 * @param data - Title with accessibility fields
 * @returns true if title has minimum required metadata
 */
export function hasMinimumAccessibilityMetadata(
  data: AccessibilityCheckData,
): boolean {
  const conformance = data.epub_accessibility_conformance;
  return !!conformance && conformance !== "00";
}

/**
 * Get accessibility compliance status for badge display
 *
 * Story 14.3 - AC5: Accessibility status indicator in titles list
 *
 * Status levels:
 * - "complete": Conformance set (not "00") and at least one feature or hazard specified
 * - "partial": Conformance set (not "00") but no features/hazards
 * - "missing": No conformance or conformance is "00"
 *
 * @param data - Title with accessibility fields
 * @returns Status level for badge display
 */
export function getAccessibilityStatus(
  data: AccessibilityCheckData,
): AccessibilityStatus {
  const conformance = data.epub_accessibility_conformance;

  // Missing: no conformance or "00" (no information)
  if (!conformance || conformance === "00") {
    return "missing";
  }

  // Check if any features or hazards are specified
  const hasFeatures =
    data.accessibility_features && data.accessibility_features.length > 0;
  const hasHazards =
    data.accessibility_hazards && data.accessibility_hazards.length > 0;

  // Complete: has conformance + at least one feature or hazard
  if (hasFeatures || hasHazards) {
    return "complete";
  }

  // Partial: has conformance but no features/hazards
  return "partial";
}

/**
 * Get human-readable label for accessibility status
 *
 * @param status - Accessibility status
 * @returns Display label
 */
export function getAccessibilityStatusLabel(
  status: AccessibilityStatus,
): string {
  switch (status) {
    case "complete":
      return "EAA Ready";
    case "partial":
      return "Partial";
    case "missing":
      return "Needs Setup";
  }
}

/**
 * Get CSS classes for accessibility status badge
 *
 * @param status - Accessibility status
 * @returns Tailwind CSS classes for badge styling
 */
export function getAccessibilityStatusStyle(
  status: AccessibilityStatus,
): string {
  switch (status) {
    case "complete":
      return "bg-green-50 text-green-700 border-green-200";
    case "partial":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "missing":
      return "bg-gray-50 text-gray-500 border-gray-200";
  }
}
