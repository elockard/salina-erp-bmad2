/**
 * ONIX 3.1 Accessibility Builder
 *
 * Story: 14.3 - Add Accessibility Metadata Support (Codelist 196)
 * Task 3: Create accessibility builder module for ONIX
 *
 * Generates ProductFormFeature XML elements for EPUB accessibility metadata.
 * Implements Codelist 196 mappings for conformance, features, and hazards.
 */

import { escapeXML, optionalElement } from "./utils/xml-escape";

/**
 * Accessibility metadata from title database record
 */
export interface AccessibilityMetadata {
  epub_accessibility_conformance: string | null;
  accessibility_features: string[] | null;
  accessibility_hazards: string[] | null;
  accessibility_summary: string | null;
}

/**
 * Human-readable descriptions for EPUB accessibility conformance codes (Codelist 196)
 */
export const CONFORMANCE_DESCRIPTIONS: Record<string, string> = {
  "00": "No accessibility information available",
  "01": "LIA Compliance Scheme",
  "02": "EPUB Accessibility 1.0 compliant",
  "03": "EPUB Accessibility 1.0 compliant with WCAG 2.0 Level A",
  "04": "EPUB Accessibility 1.0 compliant with WCAG 2.0 Level AA",
  "05": "EPUB Accessibility 1.0 compliant with WCAG 2.0 Level AAA",
  "06": "EPUB Accessibility 1.1 compliant with WCAG 2.1 Level A",
  "07": "EPUB Accessibility 1.1 compliant with WCAG 2.1 Level AA",
  "08": "EPUB Accessibility 1.1 compliant with WCAG 2.1 Level AAA",
  "09": "EPUB Accessibility 1.1 compliant with WCAG 2.2 Level A",
  "10": "EPUB Accessibility 1.1 compliant with WCAG 2.2 Level AA",
  "11": "EPUB Accessibility 1.1 compliant with WCAG 2.2 Level AAA",
};

/**
 * Build ProductFormFeature XML elements for accessibility metadata
 *
 * @param metadata - Accessibility metadata from title record
 * @returns XML string containing all ProductFormFeature elements, or empty string if no metadata
 */
export function buildAccessibilityFeatures(
  metadata: AccessibilityMetadata,
): string {
  const elements: string[] = [];

  // Conformance level (Type 09, values 00-11)
  if (metadata.epub_accessibility_conformance) {
    elements.push(
      buildConformanceElement(
        metadata.epub_accessibility_conformance,
        metadata.accessibility_summary,
      ),
    );
  }

  // Accessibility features (Type 09, values 10-26)
  if (metadata.accessibility_features?.length) {
    for (const feature of metadata.accessibility_features) {
      elements.push(buildFeatureElement(feature));
    }
  }

  // Accessibility hazards (Type 12, values 00-07)
  if (metadata.accessibility_hazards?.length) {
    for (const hazard of metadata.accessibility_hazards) {
      elements.push(buildHazardElement(hazard));
    }
  }

  return elements.join("\n");
}

/**
 * Build ProductFormFeature element for conformance level
 *
 * @param code - Conformance code (00-11)
 * @param summary - Optional accessibility summary for description
 * @returns XML element string
 */
function buildConformanceElement(code: string, summary: string | null): string {
  const description = summary || CONFORMANCE_DESCRIPTIONS[code] || "";
  const descElement = optionalElement(
    "ProductFormFeatureDescription",
    description,
  );
  const descLine = descElement ? `\n        ${descElement}` : "";

  return `      <ProductFormFeature>
        <ProductFormFeatureType>09</ProductFormFeatureType>
        <ProductFormFeatureValue>${escapeXML(code)}</ProductFormFeatureValue>${descLine}
      </ProductFormFeature>`;
}

/**
 * Build ProductFormFeature element for an accessibility feature
 *
 * @param code - Feature code (10-26)
 * @returns XML element string
 */
function buildFeatureElement(code: string): string {
  return `      <ProductFormFeature>
        <ProductFormFeatureType>09</ProductFormFeatureType>
        <ProductFormFeatureValue>${escapeXML(code)}</ProductFormFeatureValue>
      </ProductFormFeature>`;
}

/**
 * Build ProductFormFeature element for an accessibility hazard
 *
 * @param code - Hazard code (00-07)
 * @returns XML element string
 */
function buildHazardElement(code: string): string {
  return `      <ProductFormFeature>
        <ProductFormFeatureType>12</ProductFormFeatureType>
        <ProductFormFeatureValue>${escapeXML(code)}</ProductFormFeatureValue>
      </ProductFormFeature>`;
}

/**
 * Check if title has any accessibility metadata
 *
 * @param metadata - Accessibility metadata from title record
 * @returns true if any accessibility field is populated
 */
export function hasAccessibilityMetadata(
  metadata: AccessibilityMetadata,
): boolean {
  return !!(
    metadata.epub_accessibility_conformance ||
    metadata.accessibility_features?.length ||
    metadata.accessibility_hazards?.length ||
    metadata.accessibility_summary
  );
}
