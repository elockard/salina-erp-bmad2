/**
 * ONIX Validator Module
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 1: Create validator module structure
 *
 * Two-layer validation: structural (schema) then business rules.
 */

export { validateBusinessRules, validateISBN13 } from "./business-rules";
export { validateStructure } from "./schema-validator";

import type { ValidationResult } from "../types";
import { validateBusinessRules } from "./business-rules";
import { validateStructure } from "./schema-validator";

/**
 * Validates ONIX message with two-layer validation
 *
 * Layer 1: Structural validation (XML well-formed + required elements)
 * Layer 2: Business rule validation (codelists, formats, consistency)
 *
 * AC: 1 - System validates against ONIX 3.1.2 XSD schema
 * AC: 2 - System validates business rules
 *
 * @param xml - The ONIX XML string to validate
 * @returns ValidationResult with valid flag and any errors
 */
export async function validateONIXMessage(
  xml: string,
): Promise<ValidationResult> {
  // Layer 1: Structural validation (XML well-formed + required elements)
  const structureResult = await validateStructure(xml);
  if (!structureResult.valid) {
    return structureResult; // Return early - structural errors are blocking
  }

  // Layer 2: Business rule validation (codelists, formats, consistency)
  const businessResult = await validateBusinessRules(xml);
  return businessResult;
}
