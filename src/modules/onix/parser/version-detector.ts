/**
 * ONIX Version Detector
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 1: Create parser infrastructure (AC: 1)
 *
 * Detects ONIX version from XML content by analyzing namespaces,
 * DTD declarations, release attributes, and tag patterns.
 */

import type { ONIXVersion } from "./types";

/**
 * Detects the ONIX version from XML content
 *
 * Detection strategy (in order of priority):
 * 1. ONIX 3.1 namespace: xmlns="http://ns.editeur.org/onix/3.1"
 * 2. ONIX 3.0 namespace: xmlns="http://ns.editeur.org/onix/3.0"
 * 3. Release attribute: ONIXMessage release="3.1" or release="3.0"
 * 4. ONIX 2.1 indicators: DOCTYPE, lowercase tags, short tags
 *
 * @param xml - The ONIX XML string to analyze
 * @returns Detected version or "unknown" if unrecognized
 */
export function detectONIXVersion(xml: string): ONIXVersion | "unknown" {
  // Only check the first 2000 characters for efficiency
  const header = xml.slice(0, 2000);

  // Check for ONIX 3.1 namespace
  if (header.includes('xmlns="http://ns.editeur.org/onix/3.1')) {
    return "3.1";
  }

  // Check for ONIX 3.0 namespace
  if (header.includes('xmlns="http://ns.editeur.org/onix/3.0')) {
    return "3.0";
  }

  // Check for ONIX 3.x release attribute
  const releaseMatch = header.match(
    /ONIXMessage[^>]+release=["'](\d+\.\d+)["']/i,
  );
  if (releaseMatch) {
    const release = releaseMatch[1];
    if (release.startsWith("3.1")) return "3.1";
    if (release.startsWith("3.0")) return "3.0";
    // ONIX 3.x without specific minor version - default to 3.1
    if (release.startsWith("3.")) return "3.1";
  }

  // Check for ONIX 2.1 indicators

  // DOCTYPE declaration for ONIX 2.1
  if (
    header.includes("<!DOCTYPE ONIXMessage") ||
    header.includes("<!DOCTYPE ONIXmessage")
  ) {
    return "2.1";
  }

  // ONIX 2.1 uses lowercase <ONIXmessage> (note the lowercase 'm')
  if (header.includes("<ONIXmessage") || header.includes("<ONIXmessage>")) {
    return "2.1";
  }

  // Check for short tags (ONIX 2.1 feature) - pattern like <a001>, <b001>, etc.
  const shortTagPattern = /<[a-z]\d{3}>/i;
  if (shortTagPattern.test(header)) {
    return "2.1";
  }

  // Check for lowercase <product> tag (common in ONIX 2.1)
  if (header.includes("<product>") || header.includes("<product ")) {
    return "2.1";
  }

  // If we find ONIXMessage without namespace, likely 2.1 or unknown
  if (header.includes("<ONIXMessage") && !header.includes("xmlns=")) {
    return "2.1";
  }

  return "unknown";
}

/**
 * Validates that an XML string appears to be a valid ONIX message
 *
 * @param xml - The XML string to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateONIXStructure(xml: string): {
  isValid: boolean;
  error?: string;
} {
  // Check for basic XML declaration
  if (
    !xml.trim().startsWith("<?xml") &&
    !xml.trim().startsWith("<ONIXMessage") &&
    !xml.trim().startsWith("<ONIXmessage")
  ) {
    // Some ONIX files omit XML declaration, so only warn
    // Don't require it
  }

  // Must contain ONIXMessage or ONIXmessage root element
  if (
    !xml.includes("<ONIXMessage") &&
    !xml.includes("<ONIXmessage") &&
    !xml.includes("<onixmessage")
  ) {
    return {
      isValid: false,
      error: "File does not contain an ONIX message root element",
    };
  }

  // Check for Product elements
  if (
    !xml.includes("<Product") &&
    !xml.includes("<product") &&
    !xml.includes("<product>")
  ) {
    return {
      isValid: false,
      error: "ONIX message contains no Product records",
    };
  }

  return { isValid: true };
}

/**
 * Extracts approximate product count from ONIX XML without full parsing
 * Used for quick validation of file size limits
 *
 * @param xml - The ONIX XML string
 * @returns Estimated number of products
 */
export function estimateProductCount(xml: string): number {
  // Count <Product or <product opening tags
  const productPattern = /<Product[\s>]/gi;
  const matches = xml.match(productPattern);
  return matches ? matches.length : 0;
}
