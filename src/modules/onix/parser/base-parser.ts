/**
 * ONIX Parser Factory
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 1: Create parser infrastructure
 *
 * Factory function to get the appropriate parser based on ONIX version.
 */

import { ONIX21Parser } from "./onix-21-parser";
import { ONIX30Parser } from "./onix-30-parser";
import { ONIX31Parser } from "./onix-31-parser";
import type { ONIXParser, ONIXVersion } from "./types";

/**
 * Parser instances (singletons for efficiency)
 */
const parsers: Record<ONIXVersion, ONIXParser> = {
  "2.1": new ONIX21Parser(),
  "3.0": new ONIX30Parser(),
  "3.1": new ONIX31Parser(),
};

/**
 * Get parser for a specific ONIX version
 *
 * @param version - ONIX version (2.1, 3.0, or 3.1)
 * @returns Appropriate parser instance
 * @throws Error if version is not supported
 */
export function getParser(version: ONIXVersion): ONIXParser {
  const parser = parsers[version];

  if (!parser) {
    throw new Error(`Unsupported ONIX version: ${version}`);
  }

  return parser;
}

/**
 * Get all supported ONIX versions
 */
export function getSupportedVersions(): ONIXVersion[] {
  return ["2.1", "3.0", "3.1"];
}

/**
 * Check if a version is supported
 */
export function isVersionSupported(version: string): version is ONIXVersion {
  return version === "2.1" || version === "3.0" || version === "3.1";
}
