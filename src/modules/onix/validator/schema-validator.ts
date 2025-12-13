/**
 * ONIX Structural Validator
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 2: Implement Structural Validator
 *
 * Validates XML structure against ONIX 3.1 required elements.
 * Uses fast-xml-parser for serverless-compatible validation.
 */

import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { ValidationError, ValidationResult } from "../types";

/**
 * Required elements per ONIX 3.1 specification
 */
const REQUIRED_ELEMENTS = {
  product: [
    "RecordReference",
    "NotificationType",
    "ProductIdentifier",
    "DescriptiveDetail",
    "PublishingDetail",
  ],
} as const;

/**
 * Validates ONIX XML structure
 *
 * AC: 1 - System validates against ONIX 3.1.2 XSD schema
 *
 * @param xml - The ONIX XML string to validate
 * @returns ValidationResult with valid flag and any errors
 */
export async function validateStructure(
  xml: string,
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  // Step 1: Check XML is well-formed
  const xmlValidation = XMLValidator.validate(xml, {
    allowBooleanAttributes: false,
  });

  if (xmlValidation !== true) {
    return {
      valid: false,
      errors: [
        {
          type: "schema",
          code: "XML_MALFORMED",
          message: xmlValidation.err?.msg || "Invalid XML",
          path: xmlValidation.err?.line
            ? `Line ${xmlValidation.err.line}`
            : "Unknown",
        },
      ],
    };
  }

  // Step 2: Parse XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return {
      valid: false,
      errors: [
        {
          type: "schema",
          code: "XML_PARSE_ERROR",
          message: "Failed to parse XML",
          path: "/",
        },
      ],
    };
  }

  // Step 3: Validate ONIXMessage root
  if (!doc.ONIXMessage) {
    errors.push({
      type: "schema",
      code: "MISSING_ROOT",
      message: "ONIXMessage root element is required",
      path: "/",
    });
    return { valid: false, errors };
  }

  const message = doc.ONIXMessage as Record<string, unknown>;

  // Step 4: Validate Header
  if (!message.Header) {
    errors.push({
      type: "schema",
      code: "MISSING_HEADER",
      message: "Header element is required",
      path: "/ONIXMessage/Header",
    });
  } else {
    const header = message.Header as Record<string, unknown>;
    const sender = header.Sender as Record<string, unknown> | undefined;

    if (!sender?.SenderName) {
      errors.push({
        type: "schema",
        code: "MISSING_SENDER_NAME",
        message: "SenderName is required in Header/Sender",
        path: "/ONIXMessage/Header/Sender/SenderName",
      });
    }

    if (!header.SentDateTime) {
      errors.push({
        type: "schema",
        code: "MISSING_SENT_DATE",
        message: "SentDateTime is required in Header",
        path: "/ONIXMessage/Header/SentDateTime",
      });
    }
  }

  // Step 5: Validate Products
  const rawProducts = message.Product;
  const products: Record<string, unknown>[] = rawProducts
    ? Array.isArray(rawProducts)
      ? (rawProducts as Record<string, unknown>[])
      : [rawProducts as Record<string, unknown>]
    : [];

  if (products.length === 0) {
    errors.push({
      type: "schema",
      code: "NO_PRODUCTS",
      message: "At least one Product element is required",
      path: "/ONIXMessage/Product",
    });
  }

  // Validate each product
  products.forEach((product, index) => {
    const basePath = `/ONIXMessage/Product[${index}]`;

    // Check required product elements
    for (const elem of REQUIRED_ELEMENTS.product) {
      if (!product[elem]) {
        errors.push({
          type: "schema",
          code: `MISSING_${elem.toUpperCase()}`,
          message: `${elem} is required in Product`,
          path: `${basePath}/${elem}`,
        });
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
