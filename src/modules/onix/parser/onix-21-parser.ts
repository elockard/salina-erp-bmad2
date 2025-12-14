/**
 * ONIX 2.1 Parser
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 4: Implement ONIX 2.1 parser (AC: 2, 3)
 *
 * Parses ONIX 2.1 messages with support for both reference and short tags.
 * ONIX 2.1 has a different structure than 3.x versions.
 */

import { XMLParser } from "fast-xml-parser";
import { expandShortTags, hasShortTags } from "./short-tags";
import type {
  ONIXParser,
  ParsedContributor,
  ParsedHeader,
  ParsedONIXMessage,
  ParsedPrice,
  ParsedProduct,
  ParsedSubject,
  ParsingError,
} from "./types";

/**
 * ONIX 2.1 Parser Implementation
 *
 * Handles ONIX 2.1 format which differs from 3.x in:
 * - Element naming and structure
 * - Support for short tags
 * - Different composite structures
 */
export class ONIX21Parser implements ONIXParser {
  readonly version = "2.1" as const;

  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      parseAttributeValue: false, // Keep attribute values as strings
      parseTagValue: false, // Keep element text values as strings (important for ISBN, codes)
      trimValues: true,
      isArray: (name) => {
        return [
          "Product",
          "product",
          "ProductIdentifier",
          "Contributor",
          "contributor",
          "Title",
          "Subject",
          "subject",
          "Price",
          "price",
          "SupplyDetail",
          "supplydetail",
          "OtherText",
          "MediaFile",
        ].includes(name);
      },
    });
  }

  /**
   * Parse ONIX 2.1 XML message
   */
  parse(xml: string): ParsedONIXMessage {
    const errors: ParsingError[] = [];

    // Expand short tags if present
    let processedXml = xml;
    if (hasShortTags(xml)) {
      processedXml = expandShortTags(xml);
    }

    let doc: Record<string, unknown>;
    try {
      doc = this.parser.parse(processedXml) as Record<string, unknown>;
    } catch (err) {
      return {
        version: this.version,
        header: null,
        products: [],
        parsingErrors: [
          {
            productIndex: null,
            recordReference: null,
            field: "XML",
            message: err instanceof Error ? err.message : "Failed to parse XML",
            severity: "error",
          },
        ],
      };
    }

    // ONIX 2.1 can use either ONIXMessage or ONIXmessage
    const message =
      (doc.ONIXMessage as Record<string, unknown>) ||
      (doc.ONIXmessage as Record<string, unknown>) ||
      (doc.onixmessage as Record<string, unknown>);

    if (!message) {
      return {
        version: this.version,
        header: null,
        products: [],
        parsingErrors: [
          {
            productIndex: null,
            recordReference: null,
            field: "ONIXMessage",
            message: "Root ONIXMessage element not found",
            severity: "error",
          },
        ],
      };
    }

    // Parse header
    const header = this.parseHeader(message.Header as Record<string, unknown>);

    // Parse products (can be Product or product)
    const rawProducts = message.Product || message.product;
    const productArray: Record<string, unknown>[] = rawProducts
      ? Array.isArray(rawProducts)
        ? (rawProducts as Record<string, unknown>[])
        : [rawProducts as Record<string, unknown>]
      : [];

    const products: ParsedProduct[] = [];

    productArray.forEach((product, index) => {
      try {
        const parsed = this.parseProduct(product, index);
        products.push(parsed);
      } catch (err) {
        errors.push({
          productIndex: index,
          recordReference:
            (product.RecordReference as string) ||
            (product.a001 as string) ||
            null,
          field: "Product",
          message:
            err instanceof Error ? err.message : "Failed to parse product",
          severity: "error",
        });
      }
    });

    return {
      version: this.version,
      header,
      products,
      parsingErrors: errors,
    };
  }

  /**
   * Parse Header element
   */
  private parseHeader(
    header: Record<string, unknown> | undefined,
  ): ParsedHeader | null {
    if (!header) return null;

    return {
      senderName:
        (header.FromCompany as string) || (header.FromPerson as string) || null,
      senderEmail: (header.FromEmail as string) || null,
      sentDateTime: (header.SentDate as string) || null,
    };
  }

  /**
   * Parse a single Product element
   */
  private parseProduct(
    product: Record<string, unknown>,
    index: number,
  ): ParsedProduct {
    const recordReference =
      (product.RecordReference as string) || (product.a001 as string) || "";

    // Extract ISBN from various sources in 2.1
    const identifiers = this.parseProductIdentifiers(product);

    // Parse title information
    const titleInfo = this.parseTitle(product);

    // Parse contributors
    const contributors = this.parseContributors(product);

    // Parse product form
    const productForm =
      (product.ProductForm as string) || (product.b006 as string) || null;

    // Parse publishing status
    const publishingStatus =
      (product.PublishingStatus as string) || (product.b394 as string) || null;

    // Parse publication date
    const publicationDate = this.parsePublicationDate(product);

    // Parse prices
    const prices = this.parsePrices(product);

    // Parse subjects
    const subjects = this.parseSubjects(product);

    return {
      recordReference,
      isbn13: identifiers.isbn13,
      gtin13: identifiers.gtin13,
      title: titleInfo.title,
      subtitle: titleInfo.subtitle,
      contributors,
      productForm,
      publishingStatus,
      publicationDate,
      prices,
      subjects,
      rawIndex: index,
    };
  }

  /**
   * Parse product identifiers from ONIX 2.1
   */
  private parseProductIdentifiers(product: Record<string, unknown>): {
    isbn13: string | null;
    gtin13: string | null;
  } {
    const result = {
      isbn13: null as string | null,
      gtin13: null as string | null,
    };

    // Direct ISBN element (ONIX 2.1 legacy)
    const directISBN =
      (product.ISBN as string) || (product.b004 as string) || null;
    if (directISBN && directISBN.length === 13) {
      result.isbn13 = directISBN;
    }

    // Direct EAN13 element
    const directEAN =
      (product.EAN13 as string) || (product.b005 as string) || null;
    if (directEAN) {
      result.gtin13 = directEAN;
      // EAN13 is often the ISBN-13
      if (!result.isbn13 && directEAN.startsWith("978")) {
        result.isbn13 = directEAN;
      }
    }

    // ProductIdentifier composite
    const identifiers = product.ProductIdentifier;
    if (identifiers) {
      const idArray = Array.isArray(identifiers) ? identifiers : [identifiers];

      for (const id of idArray as Record<string, unknown>[]) {
        const idType =
          (id.ProductIDType as string) || (id.b221 as string) || null;
        const idValue = (id.IDValue as string) || (id.b244 as string) || null;

        if (idType === "15" || idType === "ISBN-13") {
          result.isbn13 = idValue;
        } else if (idType === "03" || idType === "GTIN-13") {
          result.gtin13 = idValue;
          if (!result.isbn13 && idValue?.startsWith("978")) {
            result.isbn13 = idValue;
          }
        } else if (idType === "02" || idType === "ISBN-10") {
          // Convert ISBN-10 to ISBN-13 if we don't have one
          if (!result.isbn13 && idValue) {
            result.isbn13 = this.convertISBN10to13(idValue);
          }
        }
      }
    }

    return result;
  }

  /**
   * Convert ISBN-10 to ISBN-13
   */
  private convertISBN10to13(isbn10: string): string | null {
    const cleaned = isbn10.replace(/[-\s]/g, "");
    if (cleaned.length !== 10) return null;

    // Remove check digit and prepend 978
    const base = `978${cleaned.slice(0, 9)}`;

    // Calculate ISBN-13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    return base + checkDigit;
  }

  /**
   * Parse title information from ONIX 2.1
   */
  private parseTitle(product: Record<string, unknown>): {
    title: string;
    subtitle: string | null;
  } {
    // Direct title elements (common in 2.1)
    let title =
      (product.DistinctiveTitle as string) ||
      (product.b026 as string) ||
      (product.TitleText as string) ||
      (product.b203 as string) ||
      "";

    let subtitle: string | null = null;

    // Handle TitlePrefix + TitleWithoutPrefix
    const prefix =
      (product.TitlePrefix as string) || (product.b027 as string) || null;
    const withoutPrefix =
      (product.TitleWithoutPrefix as string) ||
      (product.b028 as string) ||
      null;

    if (withoutPrefix) {
      title = prefix ? `${prefix} ${withoutPrefix}` : withoutPrefix;
    }

    // Check for Title composite
    const titles = product.Title;
    if (titles) {
      const titleArray = Array.isArray(titles) ? titles : [titles];

      for (const t of titleArray as Record<string, unknown>[]) {
        const titleType = (t.TitleType as string) || (t.b029 as string) || "01";

        if (titleType === "01") {
          // Distinctive title
          const text =
            (t.TitleText as string) ||
            (t.b203 as string) ||
            (t.TitleWithoutPrefix as string) ||
            (t.b028 as string) ||
            "";
          const pfx = (t.TitlePrefix as string) || (t.b027 as string) || null;

          title = pfx ? `${pfx} ${text}` : text;
          subtitle = (t.Subtitle as string) || null;
          break;
        }
      }
    }

    return { title: title.trim(), subtitle };
  }

  /**
   * Parse contributors from ONIX 2.1
   */
  private parseContributors(
    product: Record<string, unknown>,
  ): ParsedContributor[] {
    const contributors = product.Contributor || product.contributor;
    if (!contributors) return [];

    const contribArray = Array.isArray(contributors)
      ? contributors
      : [contributors];

    return (contribArray as Record<string, unknown>[]).map((c, index) => {
      const sequenceNumber =
        parseInt((c.SequenceNumber as string) || (c.b050 as string), 10) ||
        index + 1;

      const role = (c.ContributorRole as string) || (c.b034 as string) || "A01";

      // Various name formats in 2.1
      const personNameInverted =
        (c.PersonNameInverted as string) || (c.b036 as string) || null;
      const namesBeforeKey =
        (c.NamesBeforeKey as string) || (c.b037 as string) || null;
      const keyNames = (c.KeyNames as string) || (c.b038 as string) || null;
      const corporateName =
        (c.CorporateName as string) ||
        (c.b045 as string) ||
        (c.b047 as string) ||
        null;

      // If we only have PersonName, try to split it
      const personName = (c.PersonName as string) || (c.b035 as string) || null;

      let finalNamesBeforeKey = namesBeforeKey;
      let finalKeyNames = keyNames;
      let finalPersonNameInverted = personNameInverted;

      if (!personNameInverted && !namesBeforeKey && personName) {
        // Try to parse "First Last" format
        const parts = personName.trim().split(/\s+/);
        if (parts.length >= 2) {
          finalKeyNames = parts[parts.length - 1];
          finalNamesBeforeKey = parts.slice(0, -1).join(" ");
          finalPersonNameInverted = `${finalKeyNames}, ${finalNamesBeforeKey}`;
        } else {
          finalKeyNames = personName;
          finalPersonNameInverted = personName;
        }
      }

      return {
        sequenceNumber,
        role,
        personNameInverted: finalPersonNameInverted,
        namesBeforeKey: finalNamesBeforeKey,
        keyNames: finalKeyNames,
        corporateName,
      };
    });
  }

  /**
   * Parse publication date from ONIX 2.1
   */
  private parsePublicationDate(product: Record<string, unknown>): Date | null {
    // Direct PublicationDate element
    const pubDateStr =
      (product.PublicationDate as string) || (product.b003 as string) || null;

    if (pubDateStr) {
      return this.parseDateString(pubDateStr);
    }

    return null;
  }

  /**
   * Parse ONIX date string
   */
  private parseDateString(dateStr: string): Date | null {
    if (!dateStr) return null;

    const cleaned = dateStr.replace(/\D/g, "");

    if (cleaned.length >= 8) {
      const year = parseInt(cleaned.slice(0, 4), 10);
      const month = parseInt(cleaned.slice(4, 6), 10) - 1;
      const day = parseInt(cleaned.slice(6, 8), 10);
      return new Date(year, month, day);
    } else if (cleaned.length >= 6) {
      const year = parseInt(cleaned.slice(0, 4), 10);
      const month = parseInt(cleaned.slice(4, 6), 10) - 1;
      return new Date(year, month, 1);
    } else if (cleaned.length >= 4) {
      const year = parseInt(cleaned.slice(0, 4), 10);
      return new Date(year, 0, 1);
    }

    return null;
  }

  /**
   * Parse prices from ONIX 2.1
   */
  private parsePrices(product: Record<string, unknown>): ParsedPrice[] {
    const prices: ParsedPrice[] = [];

    // SupplyDetail composite
    const supplyDetails = product.SupplyDetail || product.supplydetail;
    if (supplyDetails) {
      const sdArray = Array.isArray(supplyDetails)
        ? supplyDetails
        : [supplyDetails];

      for (const sd of sdArray as Record<string, unknown>[]) {
        const priceElements = sd.Price || sd.price;
        if (!priceElements) continue;

        const priceArray = Array.isArray(priceElements)
          ? priceElements
          : [priceElements];

        for (const p of priceArray as Record<string, unknown>[]) {
          prices.push({
            priceType:
              (p.PriceTypeCode as string) || (p.j151 as string) || null,
            amount: (p.PriceAmount as string) || (p.j152 as string) || null,
            currency: (p.CurrencyCode as string) || (p.j153 as string) || null,
          });
        }
      }
    }

    return prices;
  }

  /**
   * Parse subjects from ONIX 2.1
   */
  private parseSubjects(product: Record<string, unknown>): ParsedSubject[] {
    const subjects: ParsedSubject[] = [];

    // Direct BISAC/BIC elements
    const bisacMain =
      (product.BASICMainSubject as string) ||
      (product.b069 as string) ||
      (product.b069a as string) ||
      null;
    if (bisacMain) {
      subjects.push({
        schemeIdentifier: "10", // BISAC
        code: bisacMain,
        headingText: null,
      });
    }

    const bicMain =
      (product.BICMainSubject as string) || (product.b064 as string) || null;
    if (bicMain) {
      subjects.push({
        schemeIdentifier: "12", // BIC
        code: bicMain,
        headingText: null,
      });
    }

    // Subject composite
    const subjectElements = product.Subject || product.subject;
    if (subjectElements) {
      const subArray = Array.isArray(subjectElements)
        ? subjectElements
        : [subjectElements];

      for (const s of subArray as Record<string, unknown>[]) {
        subjects.push({
          schemeIdentifier:
            (s.SubjectSchemeIdentifier as string) || (s.b067 as string) || null,
          code: (s.SubjectCode as string) || (s.b069 as string) || null,
          headingText:
            (s.SubjectHeadingText as string) || (s.b070 as string) || null,
        });
      }
    }

    return subjects;
  }
}
