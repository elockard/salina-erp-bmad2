/**
 * ONIX 3.1 Parser
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 2: Implement ONIX 3.1 parser (AC: 2, 3)
 *
 * Parses ONIX 3.1 messages using fast-xml-parser.
 * This is the primary parser implementation that 3.0 extends.
 */

import { XMLParser } from "fast-xml-parser";
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
 * ONIX 3.1 Parser Implementation
 *
 * Extracts product data from ONIX 3.1 reference tag format.
 */
export class ONIX31Parser implements ONIXParser {
  readonly version: "3.0" | "3.1" = "3.1";

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
        // Elements that can appear multiple times
        return [
          "Product",
          "ProductIdentifier",
          "Contributor",
          "TitleDetail",
          "TitleElement",
          "Subject",
          "ProductFormFeature",
          "Price",
          "SupplyDetail",
          "PublishingDate",
          "Language",
          "Extent",
        ].includes(name);
      },
    });
  }

  /**
   * Parse ONIX 3.1 XML message
   */
  parse(xml: string): ParsedONIXMessage {
    const errors: ParsingError[] = [];

    let doc: Record<string, unknown>;
    try {
      doc = this.parser.parse(xml) as Record<string, unknown>;
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

    const message = doc.ONIXMessage as Record<string, unknown>;
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

    // Parse products
    const rawProducts = message.Product;
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
          recordReference: (product.RecordReference as string) || null,
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
  protected parseHeader(
    header: Record<string, unknown> | undefined,
  ): ParsedHeader | null {
    if (!header) return null;

    const sender = header.Sender as Record<string, unknown>;

    return {
      senderName: sender?.SenderName as string | null,
      senderEmail: sender?.EmailAddress as string | null,
      sentDateTime: header.SentDateTime as string | null,
    };
  }

  /**
   * Parse a single Product element
   */
  protected parseProduct(
    product: Record<string, unknown>,
    index: number,
  ): ParsedProduct {
    const recordReference = (product.RecordReference as string) || "";

    // Extract ISBN-13 and GTIN-13 from ProductIdentifier
    const identifiers = this.parseProductIdentifiers(
      product.ProductIdentifier as
        | Record<string, unknown>[]
        | Record<string, unknown>,
    );

    // Parse DescriptiveDetail (Block 1)
    const dd = product.DescriptiveDetail as Record<string, unknown>;
    const titleInfo = this.parseTitleDetail(dd);
    const contributors = this.parseContributors(dd);
    const productForm = dd?.ProductForm as string | null;

    // Parse PublishingDetail (Block 4)
    const pd = product.PublishingDetail as Record<string, unknown>;
    const publishingStatus = this.parsePublishingStatus(pd);
    const publicationDate = this.parsePublicationDate(pd);

    // Parse ProductSupply (Block 6) - for display only
    const ps = product.ProductSupply as Record<string, unknown>;
    const prices = this.parsePrices(ps);

    // Parse subjects - for display only
    const subjects = this.parseSubjects(dd);

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
   * Parse ProductIdentifier elements
   */
  protected parseProductIdentifiers(
    identifiers:
      | Record<string, unknown>[]
      | Record<string, unknown>
      | undefined,
  ): { isbn13: string | null; gtin13: string | null } {
    const result = {
      isbn13: null as string | null,
      gtin13: null as string | null,
    };

    if (!identifiers) return result;

    const idArray = Array.isArray(identifiers) ? identifiers : [identifiers];

    for (const id of idArray) {
      const idType = id.ProductIDType as string;
      const idValue = id.IDValue as string;

      if (idType === "15") {
        // ISBN-13
        result.isbn13 = idValue || null;
      } else if (idType === "03") {
        // GTIN-13
        result.gtin13 = idValue || null;
      }
    }

    return result;
  }

  /**
   * Parse TitleDetail element
   */
  protected parseTitleDetail(dd: Record<string, unknown> | undefined): {
    title: string;
    subtitle: string | null;
  } {
    if (!dd) return { title: "", subtitle: null };

    const titleDetails = dd.TitleDetail as
      | Record<string, unknown>[]
      | Record<string, unknown>;
    const titleDetailArray = titleDetails
      ? Array.isArray(titleDetails)
        ? titleDetails
        : [titleDetails]
      : [];

    // Find TitleType 01 (Distinctive title)
    const mainTitle = titleDetailArray.find((td) => {
      const titleType = td.TitleType as string;
      return !titleType || titleType === "01";
    });

    if (!mainTitle) {
      // Fall back to first title detail
      const firstTitle = titleDetailArray[0];
      if (firstTitle) {
        return this.extractTitleFromDetail(firstTitle);
      }
      return { title: "", subtitle: null };
    }

    return this.extractTitleFromDetail(mainTitle);
  }

  /**
   * Extract title text from TitleDetail
   */
  protected extractTitleFromDetail(td: Record<string, unknown>): {
    title: string;
    subtitle: string | null;
  } {
    const titleElements = td.TitleElement as
      | Record<string, unknown>[]
      | Record<string, unknown>;
    const elements = titleElements
      ? Array.isArray(titleElements)
        ? titleElements
        : [titleElements]
      : [];

    // Find product-level title element (TitleElementLevel 01)
    const productTitle =
      elements.find((te) => {
        const level = te.TitleElementLevel as string;
        return !level || level === "01";
      }) || elements[0];

    if (!productTitle) return { title: "", subtitle: null };

    const titleText =
      (productTitle.TitleText as string) ||
      (productTitle.TitleWithoutPrefix as string) ||
      "";
    const subtitle = productTitle.Subtitle as string | null;

    // Handle TitlePrefix + TitleWithoutPrefix combo
    const prefix = productTitle.TitlePrefix as string;
    const fullTitle = prefix ? `${prefix} ${titleText}`.trim() : titleText;

    return { title: fullTitle, subtitle };
  }

  /**
   * Parse Contributor elements
   */
  protected parseContributors(
    dd: Record<string, unknown> | undefined,
  ): ParsedContributor[] {
    if (!dd) return [];

    const contributors = dd.Contributor as
      | Record<string, unknown>[]
      | Record<string, unknown>;
    if (!contributors) return [];

    const contribArray = Array.isArray(contributors)
      ? contributors
      : [contributors];

    return contribArray.map((c, index) => ({
      sequenceNumber: parseInt(c.SequenceNumber as string, 10) || index + 1,
      role: (c.ContributorRole as string) || "A01", // Default to Author
      personNameInverted: c.PersonNameInverted as string | null,
      namesBeforeKey: c.NamesBeforeKey as string | null,
      keyNames: c.KeyNames as string | null,
      corporateName: c.CorporateName as string | null,
    }));
  }

  /**
   * Parse PublishingStatus from PublishingDetail
   */
  protected parsePublishingStatus(
    pd: Record<string, unknown> | undefined,
  ): string | null {
    if (!pd) return null;
    return pd.PublishingStatus as string | null;
  }

  /**
   * Parse PublicationDate from PublishingDetail
   */
  protected parsePublicationDate(
    pd: Record<string, unknown> | undefined,
  ): Date | null {
    if (!pd) return null;

    const pubDates = pd.PublishingDate as
      | Record<string, unknown>[]
      | Record<string, unknown>;
    if (!pubDates) return null;

    const dateArray = Array.isArray(pubDates) ? pubDates : [pubDates];

    // Find publication date (role 01)
    const pubDate =
      dateArray.find((d) => {
        const role = d.PublishingDateRole as string;
        return !role || role === "01";
      }) || dateArray[0];

    if (!pubDate) return null;

    const dateStr = pubDate.Date as string;
    if (!dateStr) return null;

    return this.parseDateString(dateStr);
  }

  /**
   * Parse ONIX date string (YYYYMMDD or YYYYMM or YYYY)
   */
  protected parseDateString(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Remove any non-numeric characters
    const cleaned = dateStr.replace(/\D/g, "");

    if (cleaned.length >= 8) {
      // YYYYMMDD
      const year = parseInt(cleaned.slice(0, 4), 10);
      const month = parseInt(cleaned.slice(4, 6), 10) - 1;
      const day = parseInt(cleaned.slice(6, 8), 10);
      return new Date(year, month, day);
    } else if (cleaned.length >= 6) {
      // YYYYMM - use first day of month
      const year = parseInt(cleaned.slice(0, 4), 10);
      const month = parseInt(cleaned.slice(4, 6), 10) - 1;
      return new Date(year, month, 1);
    } else if (cleaned.length >= 4) {
      // YYYY - use January 1st
      const year = parseInt(cleaned.slice(0, 4), 10);
      return new Date(year, 0, 1);
    }

    return null;
  }

  /**
   * Parse Price elements from ProductSupply - for display only
   */
  protected parsePrices(
    ps: Record<string, unknown> | undefined,
  ): ParsedPrice[] {
    if (!ps) return [];

    // Handle multiple supply details
    const supplyDetails = ps.SupplyDetail as
      | Record<string, unknown>[]
      | Record<string, unknown>;
    if (!supplyDetails) return [];

    const sdArray = Array.isArray(supplyDetails)
      ? supplyDetails
      : [supplyDetails];

    const prices: ParsedPrice[] = [];

    for (const sd of sdArray) {
      const priceElements = sd.Price as
        | Record<string, unknown>[]
        | Record<string, unknown>;
      if (!priceElements) continue;

      const priceArray = Array.isArray(priceElements)
        ? priceElements
        : [priceElements];

      for (const p of priceArray) {
        prices.push({
          priceType: p.PriceType as string | null,
          amount: p.PriceAmount as string | null,
          currency: p.CurrencyCode as string | null,
        });
      }
    }

    return prices;
  }

  /**
   * Parse Subject elements - for display only
   */
  protected parseSubjects(
    dd: Record<string, unknown> | undefined,
  ): ParsedSubject[] {
    if (!dd) return [];

    const subjects = dd.Subject as
      | Record<string, unknown>[]
      | Record<string, unknown>;
    if (!subjects) return [];

    const subjectArray = Array.isArray(subjects) ? subjects : [subjects];

    return subjectArray.map((s) => ({
      schemeIdentifier: s.SubjectSchemeIdentifier as string | null,
      code: s.SubjectCode as string | null,
      headingText: s.SubjectHeadingText as string | null,
    }));
  }
}
