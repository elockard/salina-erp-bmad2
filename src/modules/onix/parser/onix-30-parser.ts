/**
 * ONIX 3.0 Parser
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 3: Implement ONIX 3.0 parser (AC: 2, 3)
 *
 * Extends ONIX 3.1 parser with version-specific handling.
 * ONIX 3.0 and 3.1 have minimal structural differences.
 */

import { ONIX31Parser } from "./onix-31-parser";
import type { ParsedONIXMessage } from "./types";

/**
 * ONIX 3.0 Parser Implementation
 *
 * Extends ONIX 3.1 parser - the differences between 3.0 and 3.1
 * are minor and mostly relate to codelist additions.
 */
export class ONIX30Parser extends ONIX31Parser {
  readonly version = "3.0" as const;

  /**
   * Parse ONIX 3.0 XML message
   *
   * @param xml - ONIX 3.0 XML string
   * @returns Parsed message with version set to 3.0
   */
  parse(xml: string): ParsedONIXMessage {
    // Parse using base ONIX 3.1 parser
    const result = super.parse(xml);

    // Override version
    return {
      ...result,
      version: "3.0",
    };
  }
}
