/**
 * ONIX Message Builder
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 * Story: 14.6 - Add ONIX 3.0 Export Fallback
 * Task 2: Implement ONIXMessageBuilder class
 *
 * Type-safe builder for generating ONIX 3.0 and 3.1 XML messages.
 * Follows Pattern 4 from architecture.md.
 */

import type { TitleWithAuthors } from "@/modules/title-authors/queries";
import type { ONIXVersion } from "../parser/types";
import { buildAccessibilityFeatures } from "./accessibility";
import {
  escapeXML,
  formatPublishingDate,
  formatSentDateTime,
  optionalElement,
} from "./utils/xml-escape";

/**
 * Tenant information needed for ONIX generation
 */
interface TenantInfo {
  id: string;
  name: string;
  email?: string | null;
  subdomain: string;
  default_currency?: string;
}

/**
 * Contributor name structure for ONIX
 */
interface ContributorName {
  personNameInverted: string;
  namesBeforeKey: string;
  keyNames: string;
}

/**
 * Map publication status to ONIX Codelist 65 ProductAvailability codes
 *
 * Story 16.4 - AC1: Dynamic ProductAvailability in ONIX Export
 *
 * Codelist 65 Reference:
 * - 10: Not yet available
 * - 20: Available
 * - 40: Not available (e.g., out of print)
 *
 * @param publicationStatus - Title publication status from database
 * @returns ONIX Codelist 65 code as string
 */
export function getProductAvailabilityCode(
  publicationStatus: string | null,
): string {
  switch (publicationStatus) {
    case "draft":
    case "pending":
      return "10"; // Not yet available
    case "published":
      return "20"; // Available
    case "out_of_print":
      return "40"; // Not available
    default:
      return "20"; // Default to available for unknown status
  }
}

/**
 * ONIX Message Builder
 *
 * Generates valid ONIX 3.0 and 3.1 XML messages from title catalog data.
 * Supports single and batch export with multi-author handling.
 *
 * Story 14.6: Added version parameter to support ONIX 3.0 fallback for legacy channels.
 *
 * @example
 * ```typescript
 * // Default: ONIX 3.1
 * const builder = new ONIXMessageBuilder(tenantId, tenant);
 *
 * // ONIX 3.0 for legacy channels (e.g., Ingram)
 * const builder30 = new ONIXMessageBuilder(tenantId, tenant, "3.0");
 *
 * builder.addTitle(titleWithAuthors);
 * const xml = builder.toXML();
 * ```
 */
export class ONIXMessageBuilder {
  private tenant: TenantInfo;
  private products: string[] = [];
  private sentDateTime: string;
  private version: ONIXVersion;

  constructor(
    _tenantId: string,
    tenant: TenantInfo,
    version: ONIXVersion = "3.1",
  ) {
    this.tenant = tenant;
    this.sentDateTime = formatSentDateTime(new Date());
    this.version = version;
  }

  /**
   * Get the ONIX namespace for the configured version
   * Story 14.6: Support both 3.0 and 3.1 namespaces
   */
  private getNamespace(): string {
    return this.version === "3.0"
      ? "http://ns.editeur.org/onix/3.0/reference"
      : "http://ns.editeur.org/onix/3.1/reference";
  }

  /**
   * Get the release attribute for the configured version
   */
  private getRelease(): string {
    return this.version === "3.0" ? "3.0" : "3.1";
  }

  /**
   * Add a title to the ONIX message
   * @param title - Title with authors from getTitleWithAuthors query
   * @returns this for method chaining
   */
  addTitle(title: TitleWithAuthors): this {
    const productXML = this.buildProduct(title);
    this.products.push(productXML);
    return this;
  }

  /**
   * Generate the complete ONIX XML message
   * Story 14.6: Uses configured version for release attribute and namespace
   * @returns Complete XML string
   */
  toXML(): string {
    const header = this.buildHeader();
    const products = this.products.join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="${this.getRelease()}" xmlns="${this.getNamespace()}">
${header}
${products}
</ONIXMessage>`;
  }

  /**
   * Build the ONIX Header element
   */
  private buildHeader(): string {
    const emailElement = this.tenant.email
      ? `    <EmailAddress>${escapeXML(this.tenant.email)}</EmailAddress>`
      : "";

    return `  <Header>
    <Sender>
      <SenderName>${escapeXML(this.tenant.name)}</SenderName>
${emailElement ? `${emailElement}\n` : ""}    </Sender>
    <SentDateTime>${this.sentDateTime}</SentDateTime>
    <DefaultLanguageOfText>eng</DefaultLanguageOfText>
    <DefaultCurrencyCode>${this.tenant.default_currency || "USD"}</DefaultCurrencyCode>
  </Header>`;
  }

  /**
   * Build a complete Product element
   *
   * Story 16.4: Now passes title to buildProductSupply for dynamic availability
   */
  private buildProduct(title: TitleWithAuthors): string {
    const recordReference = this.generateRecordReference(title.id);
    const identifiers = this.buildProductIdentifiers(title.isbn);
    const descriptiveDetail = this.buildDescriptiveDetail(title);
    const publishingDetail = this.buildPublishingDetail(title);
    const productSupply = this.buildProductSupply(title);

    return `  <Product>
    <RecordReference>${recordReference}</RecordReference>
    <NotificationType>03</NotificationType>
${identifiers}
${descriptiveDetail}
${publishingDetail}
${productSupply}
  </Product>`;
  }

  /**
   * Generate unique, persistent RecordReference
   */
  private generateRecordReference(titleId: string): string {
    return `${this.tenant.subdomain}-${titleId}`;
  }

  /**
   * Build ProductIdentifier elements (ISBN-13 and GTIN-13)
   */
  private buildProductIdentifiers(isbn: string | null): string {
    if (!isbn) {
      return "";
    }

    return `    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>${escapeXML(isbn)}</IDValue>
    </ProductIdentifier>
    <ProductIdentifier>
      <ProductIDType>03</ProductIDType>
      <IDValue>${escapeXML(isbn)}</IDValue>
    </ProductIdentifier>`;
  }

  /**
   * Build DescriptiveDetail (Block 1)
   *
   * Story 14.3: Added accessibility metadata via ProductFormFeature elements
   */
  private buildDescriptiveDetail(title: TitleWithAuthors): string {
    const titleDetail = this.buildTitleDetail(title);
    const contributors = this.buildContributors(title.authors);
    const accessibilityXML = buildAccessibilityFeatures({
      epub_accessibility_conformance: title.epub_accessibility_conformance,
      accessibility_features: title.accessibility_features,
      accessibility_hazards: title.accessibility_hazards,
      accessibility_summary: title.accessibility_summary,
    });
    const accessibilityBlock = accessibilityXML ? `\n${accessibilityXML}` : "";

    return `    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>${accessibilityBlock}
${titleDetail}
${contributors}
    </DescriptiveDetail>`;
  }

  /**
   * Build TitleDetail element
   */
  private buildTitleDetail(title: TitleWithAuthors): string {
    const subtitleElement = optionalElement("Subtitle", title.subtitle);
    const subtitleLine = subtitleElement
      ? `\n          ${subtitleElement}`
      : "";

    return `      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>${escapeXML(title.title)}</TitleText>${subtitleLine}
        </TitleElement>
      </TitleDetail>`;
  }

  /**
   * Build Contributor elements for all authors
   */
  private buildContributors(authors: TitleWithAuthors["authors"]): string {
    if (!authors || authors.length === 0) {
      return "";
    }

    return authors
      .map((author, index) => this.buildContributor(author, index + 1))
      .join("\n");
  }

  /**
   * Build a single Contributor element
   */
  private buildContributor(
    author: TitleWithAuthors["authors"][0],
    sequenceNumber: number,
  ): string {
    const names = this.formatContributorName(author.contact);

    return `      <Contributor>
        <SequenceNumber>${sequenceNumber}</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonNameInverted>${escapeXML(names.personNameInverted)}</PersonNameInverted>
        <NamesBeforeKey>${escapeXML(names.namesBeforeKey)}</NamesBeforeKey>
        <KeyNames>${escapeXML(names.keyNames)}</KeyNames>
      </Contributor>`;
  }

  /**
   * Format contributor name from contact
   * Note: Pen name support would require fetching from contact_roles table
   */
  private formatContributorName(contact: {
    first_name: string | null;
    last_name: string | null;
  }): ContributorName {
    const firstName = contact.first_name || "";
    const lastName = contact.last_name || "";

    return {
      personNameInverted: lastName ? `${lastName}, ${firstName}` : firstName,
      namesBeforeKey: firstName,
      keyNames: lastName,
    };
  }

  /**
   * Build PublishingDetail (Block 4)
   */
  private buildPublishingDetail(title: TitleWithAuthors): string {
    const pubDate = title.created_at
      ? formatPublishingDate(new Date(title.created_at))
      : formatPublishingDate(new Date());

    return `    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>${escapeXML(this.tenant.name)}</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate>
        <PublishingDateRole>01</PublishingDateRole>
        <Date>${pubDate}</Date>
      </PublishingDate>
    </PublishingDetail>`;
  }

  /**
   * Build ProductSupply (Block 6)
   *
   * Story 16.4: Now uses dynamic ProductAvailability based on title status
   * Maps publication_status to ONIX Codelist 65 values via getProductAvailabilityCode
   *
   * @param title - Title with publication_status for availability mapping
   */
  private buildProductSupply(title: TitleWithAuthors): string {
    const currency = this.tenant.default_currency || "USD";
    const availabilityCode = getProductAvailabilityCode(
      title.publication_status,
    );

    return `    <ProductSupply>
      <Market>
        <Territory>
          <CountriesIncluded>US</CountriesIncluded>
        </Territory>
      </Market>
      <SupplyDetail>
        <Supplier>
          <SupplierRole>01</SupplierRole>
          <SupplierName>${escapeXML(this.tenant.name)}</SupplierName>
        </Supplier>
        <ProductAvailability>${availabilityCode}</ProductAvailability>
        <Price>
          <PriceType>01</PriceType>
          <PriceAmount>0.00</PriceAmount>
          <CurrencyCode>${currency}</CurrencyCode>
        </Price>
      </SupplyDetail>
    </ProductSupply>`;
  }
}
