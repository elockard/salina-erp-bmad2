/**
 * ONIX Business Rule Validator
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 3: Implement Business Rule Validator
 *
 * Validates ONIX data against EDItEUR codelists and business rules.
 */

import { XMLParser } from "fast-xml-parser";
import type { ValidationError, ValidationResult } from "../types";

/**
 * EDItEUR Codelist values (subset relevant to our implementation)
 */
const CODELIST_VALUES = {
  // List 5: Product Identifier Type
  productIDType: ["03", "15"], // GTIN-13, ISBN-13
  // List 1: Notification Type
  notificationType: ["03"], // New/Update
  // List 2: Product Composition
  productComposition: ["00"], // Single-item
  // List 15: Title Type
  titleType: ["01"], // Distinctive title
  // List 17: Contributor Role
  contributorRole: ["A01", "B01"], // Author, Editor
  // List 45: Publishing Role
  publishingRole: ["01"], // Publisher
  // List 64: Publishing Status
  publishingStatus: ["04"], // Active
  // List 65: Product Availability
  productAvailability: ["20"], // Available
  // List 93: Supplier Role
  supplierRole: ["01"], // Publisher to retailer
  // List 150: Product Form (subset)
  productForm: ["BB", "BC", "BD", "BE", "EA", "EB", "EC", "ED"], // Hardback, Paperback, etc.
  // List 163: Publishing Date Role
  publishingDateRole: ["01"], // Publication date
} as const;

/**
 * Valid ISO 4217 currency codes
 */
const VALID_CURRENCY_CODES = ["USD", "EUR", "GBP", "CAD", "AUD"];

/**
 * Validates ISBN-13 checksum
 *
 * @param isbn - The ISBN-13 string to validate
 * @returns true if valid, false otherwise
 */
export function validateISBN13(isbn: string): boolean {
  if (!isbn || isbn.length !== 13 || !/^\d{13}$/.test(isbn)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number.parseInt(isbn[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number.parseInt(isbn[12], 10);
}

/**
 * Validates ONIX business rules
 *
 * AC: 2 - System validates business rules
 *
 * @param xml - The ONIX XML string to validate
 * @returns ValidationResult with valid flag and any errors
 */
export async function validateBusinessRules(
  xml: string,
): Promise<ValidationResult> {
  // Configure parser to preserve string values for codelist elements
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false, // Keep all values as strings
  });
  const doc = parser.parse(xml) as Record<string, unknown>;
  const errors: ValidationError[] = [];

  const message = doc.ONIXMessage as Record<string, unknown>;
  if (!message) {
    return { valid: false, errors: [] }; // Let schema validator catch this
  }

  const rawProducts = message.Product;
  const products: Record<string, unknown>[] = rawProducts
    ? Array.isArray(rawProducts)
      ? (rawProducts as Record<string, unknown>[])
      : [rawProducts as Record<string, unknown>]
    : [];

  products.forEach((product, index) => {
    const basePath = `Product[${index}]`;

    // Validate RecordReference exists
    if (!product.RecordReference) {
      errors.push({
        type: "business",
        code: "MISSING_RECORD_REF",
        message: "RecordReference is required",
        path: `${basePath}/RecordReference`,
      });
    }

    // Validate ProductIdentifier
    const rawIdentifiers = product.ProductIdentifier;
    const identifiers: Record<string, unknown>[] = rawIdentifiers
      ? Array.isArray(rawIdentifiers)
        ? (rawIdentifiers as Record<string, unknown>[])
        : [rawIdentifiers as Record<string, unknown>]
      : [];

    if (identifiers.length === 0) {
      errors.push({
        type: "business",
        code: "MISSING_IDENTIFIER",
        message: "At least one ProductIdentifier is required",
        path: `${basePath}/ProductIdentifier`,
      });
    }

    identifiers.forEach((id, idIndex) => {
      const idType = id.ProductIDType as string;

      // Validate ProductIDType codelist
      if (
        idType &&
        !CODELIST_VALUES.productIDType.includes(idType as "03" | "15")
      ) {
        errors.push({
          type: "business",
          code: "INVALID_CODELIST",
          message: "Invalid ProductIDType value",
          path: `${basePath}/ProductIdentifier[${idIndex}]/ProductIDType`,
          expected: CODELIST_VALUES.productIDType.join(", "),
          actual: idType,
          codelistRef: "List 5",
        });
      }

      // Validate ISBN-13 checksum if type 15
      const idValue = id.IDValue as string;
      if (idType === "15" && idValue && !validateISBN13(idValue)) {
        errors.push({
          type: "business",
          code: "INVALID_ISBN",
          message: "Invalid ISBN-13 checksum",
          path: `${basePath}/ProductIdentifier[${idIndex}]/IDValue`,
          actual: idValue,
        });
      }
    });

    // Validate DescriptiveDetail
    const dd = product.DescriptiveDetail as Record<string, unknown> | undefined;
    if (dd) {
      const productForm = dd.ProductForm as string;

      // ProductForm codelist
      if (
        productForm &&
        !CODELIST_VALUES.productForm.includes(
          productForm as (typeof CODELIST_VALUES.productForm)[number],
        )
      ) {
        errors.push({
          type: "business",
          code: "INVALID_CODELIST",
          message: "Invalid ProductForm value",
          path: `${basePath}/DescriptiveDetail/ProductForm`,
          expected: "See List 150",
          actual: productForm,
          codelistRef: "List 150",
        });
      }

      // TitleDetail required
      const titleDetail = dd.TitleDetail as Record<string, unknown> | undefined;
      const titleElement = titleDetail?.TitleElement as
        | Record<string, unknown>
        | undefined;
      if (!titleElement?.TitleText) {
        errors.push({
          type: "business",
          code: "MISSING_TITLE",
          message: "TitleText is required",
          path: `${basePath}/DescriptiveDetail/TitleDetail/TitleElement/TitleText`,
        });
      }
    } else {
      errors.push({
        type: "business",
        code: "MISSING_BLOCK",
        message: "DescriptiveDetail (Block 1) is required",
        path: `${basePath}/DescriptiveDetail`,
      });
    }

    // Validate ProductSupply pricing
    const ps = product.ProductSupply as Record<string, unknown> | undefined;
    const sd = ps?.SupplyDetail as Record<string, unknown> | undefined;
    const price = sd?.Price as Record<string, unknown> | undefined;

    if (price) {
      const currencyCode = price.CurrencyCode as string;

      // Currency code validation
      if (currencyCode && !VALID_CURRENCY_CODES.includes(currencyCode)) {
        errors.push({
          type: "business",
          code: "INVALID_CURRENCY",
          message: "Invalid or unsupported currency code",
          path: `${basePath}/ProductSupply/SupplyDetail/Price/CurrencyCode`,
          expected: VALID_CURRENCY_CODES.join(", "),
          actual: currencyCode,
        });
      }

      // Price amount must be numeric and non-negative
      const priceAmount = price.PriceAmount as string;
      if (priceAmount !== undefined) {
        const numericPrice = Number.parseFloat(priceAmount);
        if (Number.isNaN(numericPrice) || numericPrice < 0) {
          errors.push({
            type: "business",
            code: "INVALID_PRICE",
            message: "PriceAmount must be a non-negative number",
            path: `${basePath}/ProductSupply/SupplyDetail/Price/PriceAmount`,
            actual: priceAmount,
          });
        }
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
