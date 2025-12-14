/**
 * ONIX Import Parser Unit Tests
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 10: Write tests (all ACs)
 *
 * Tests for ONIX version detection, parsing, field mapping, and validation.
 */

import { describe, expect, it } from "vitest";
import {
  getParser,
  isVersionSupported,
} from "@/modules/onix/parser/base-parser";
import { detectAndConvertEncoding } from "@/modules/onix/parser/encoding-handler";
import {
  mapPublishingStatus,
  mapToSalinaTitle,
} from "@/modules/onix/parser/field-mapper";
import { ONIX21Parser } from "@/modules/onix/parser/onix-21-parser";
import { ONIX30Parser } from "@/modules/onix/parser/onix-30-parser";
import { ONIX31Parser } from "@/modules/onix/parser/onix-31-parser";
import {
  expandShortTags,
  hasShortTags,
} from "@/modules/onix/parser/short-tags";
import type { MappedTitle, ParsedProduct } from "@/modules/onix/parser/types";
import {
  checkDuplicateISBNs,
  validateFileConstraints,
  validateImportProduct,
  validateProductCount,
} from "@/modules/onix/parser/validation";
import {
  detectONIXVersion,
  estimateProductCount,
  validateONIXStructure,
} from "@/modules/onix/parser/version-detector";

// =============================================================================
// Test Fixtures
// =============================================================================

const ONIX_31_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.1" xmlns="http://ns.editeur.org/onix/3.1/reference">
  <Header>
    <Sender>
      <SenderName>Test Publisher</SenderName>
      <EmailAddress>test@example.com</EmailAddress>
    </Sender>
    <SentDateTime>20250101</SentDateTime>
  </Header>
  <Product>
    <RecordReference>TEST-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780306406157</IDValue>
    </ProductIdentifier>
    <ProductIdentifier>
      <ProductIDType>03</ProductIDType>
      <IDValue>9780306406157</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test Book Title</TitleText>
          <Subtitle>A Comprehensive Guide</Subtitle>
        </TitleElement>
      </TitleDetail>
      <Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonNameInverted>Smith, John</PersonNameInverted>
        <NamesBeforeKey>John</NamesBeforeKey>
        <KeyNames>Smith</KeyNames>
      </Contributor>
      <Contributor>
        <SequenceNumber>2</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonNameInverted>Doe, Jane</PersonNameInverted>
        <NamesBeforeKey>Jane</NamesBeforeKey>
        <KeyNames>Doe</KeyNames>
      </Contributor>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test Publisher</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
      <PublishingDate>
        <PublishingDateRole>01</PublishingDateRole>
        <Date>20250115</Date>
      </PublishingDate>
    </PublishingDetail>
    <ProductSupply>
      <SupplyDetail>
        <Supplier>
          <SupplierRole>01</SupplierRole>
          <SupplierName>Test Publisher</SupplierName>
        </Supplier>
        <ProductAvailability>20</ProductAvailability>
        <Price>
          <PriceType>01</PriceType>
          <PriceAmount>19.99</PriceAmount>
          <CurrencyCode>USD</CurrencyCode>
        </Price>
      </SupplyDetail>
    </ProductSupply>
  </Product>
</ONIXMessage>`;

const ONIX_30_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference">
  <Header>
    <Sender>
      <SenderName>Publisher 3.0</SenderName>
    </Sender>
    <SentDateTime>20250101</SentDateTime>
  </Header>
  <Product>
    <RecordReference>ONIX30-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780131103627</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BB</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>ONIX 3.0 Book</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;

const ONIX_21_REFERENCE_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ONIXMessage SYSTEM "http://www.editeur.org/onix/2.1/reference/onix-international.dtd">
<ONIXMessage>
  <Header>
    <FromCompany>ONIX 2.1 Publisher</FromCompany>
    <SentDate>20250101</SentDate>
  </Header>
  <Product>
    <RecordReference>ONIX21-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ISBN>9789876543210</ISBN>
    <ProductForm>BC</ProductForm>
    <DistinctiveTitle>Legacy ONIX Book</DistinctiveTitle>
    <Contributor>
      <ContributorRole>A01</ContributorRole>
      <PersonName>Robert Johnson</PersonName>
    </Contributor>
    <PublishingStatus>04</PublishingStatus>
    <PublicationDate>20250201</PublicationDate>
  </Product>
</ONIXMessage>`;

const ONIX_21_SHORT_TAGS_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage>
  <Header>
    <m174>Short Tag Publisher</m174>
    <m182>20250101</m182>
  </Header>
  <Product>
    <a001>SHORT-001</a001>
    <a002>03</a002>
    <b004>9780987654321</b004>
    <b006>BC</b006>
    <b203>Short Tag Book Title</b203>
    <Contributor>
      <b034>A01</b034>
      <b036>Writer, The</b036>
    </Contributor>
    <b394>04</b394>
    <b003>20250301</b003>
  </Product>
</ONIXMessage>`;

const INVALID_ONIX_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<NotAnONIXMessage>
  <SomeElement>This is not ONIX</SomeElement>
</NotAnONIXMessage>`;

// =============================================================================
// Version Detection Tests
// =============================================================================

describe("ONIX Version Detection", () => {
  it("should detect ONIX 3.1 from namespace", () => {
    expect(detectONIXVersion(ONIX_31_SAMPLE)).toBe("3.1");
  });

  it("should detect ONIX 3.0 from namespace", () => {
    expect(detectONIXVersion(ONIX_30_SAMPLE)).toBe("3.0");
  });

  it("should detect ONIX 2.1 from DOCTYPE", () => {
    expect(detectONIXVersion(ONIX_21_REFERENCE_SAMPLE)).toBe("2.1");
  });

  it("should detect ONIX 2.1 from short tags", () => {
    expect(detectONIXVersion(ONIX_21_SHORT_TAGS_SAMPLE)).toBe("2.1");
  });

  it("should return unknown for invalid ONIX", () => {
    expect(detectONIXVersion(INVALID_ONIX_SAMPLE)).toBe("unknown");
  });

  it("should detect version from release attribute", () => {
    const xml = `<ONIXMessage release="3.1"><Product></Product></ONIXMessage>`;
    expect(detectONIXVersion(xml)).toBe("3.1");
  });
});

describe("ONIX Structure Validation", () => {
  it("should validate valid ONIX structure", () => {
    const result = validateONIXStructure(ONIX_31_SAMPLE);
    expect(result.isValid).toBe(true);
  });

  it("should reject non-ONIX XML", () => {
    const result = validateONIXStructure(INVALID_ONIX_SAMPLE);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("ONIX message root element");
  });

  it("should reject ONIX without products", () => {
    const xml = `<ONIXMessage><Header></Header></ONIXMessage>`;
    const result = validateONIXStructure(xml);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("no Product records");
  });
});

describe("Product Count Estimation", () => {
  it("should estimate product count correctly", () => {
    expect(estimateProductCount(ONIX_31_SAMPLE)).toBe(1);
    expect(estimateProductCount(ONIX_30_SAMPLE)).toBe(1);
  });

  it("should handle multiple products", () => {
    const xml = `<ONIXMessage>
      <Product><RecordReference>1</RecordReference></Product>
      <Product><RecordReference>2</RecordReference></Product>
      <Product><RecordReference>3</RecordReference></Product>
    </ONIXMessage>`;
    expect(estimateProductCount(xml)).toBe(3);
  });
});

// =============================================================================
// Short Tag Tests
// =============================================================================

describe("ONIX 2.1 Short Tags", () => {
  it("should detect short tags", () => {
    expect(hasShortTags(ONIX_21_SHORT_TAGS_SAMPLE)).toBe(true);
    expect(hasShortTags(ONIX_31_SAMPLE)).toBe(false);
  });

  it("should expand short tags correctly", () => {
    const expanded = expandShortTags("<a001>TEST</a001>");
    expect(expanded).toBe("<RecordReference>TEST</RecordReference>");
  });

  it("should expand multiple short tags", () => {
    const input = "<a001>REF</a001><b004>1234567890</b004><b006>BC</b006>";
    const expanded = expandShortTags(input);
    expect(expanded).toContain("<RecordReference>");
    expect(expanded).toContain("<ISBN>");
    expect(expanded).toContain("<ProductForm>");
  });
});

// =============================================================================
// Parser Tests
// =============================================================================

describe("ONIX 3.1 Parser", () => {
  const parser = new ONIX31Parser();

  it("should parse valid ONIX 3.1 message", () => {
    const result = parser.parse(ONIX_31_SAMPLE);

    expect(result.version).toBe("3.1");
    expect(result.parsingErrors).toHaveLength(0);
    expect(result.products).toHaveLength(1);
  });

  it("should parse header information", () => {
    const result = parser.parse(ONIX_31_SAMPLE);

    expect(result.header).not.toBeNull();
    expect(result.header?.senderName).toBe("Test Publisher");
    expect(result.header?.senderEmail).toBe("test@example.com");
  });

  it("should parse product identifiers", () => {
    const result = parser.parse(ONIX_31_SAMPLE);
    const product = result.products[0];

    expect(product.isbn13).toBe("9780306406157");
    expect(product.gtin13).toBe("9780306406157");
  });

  it("should parse title information", () => {
    const result = parser.parse(ONIX_31_SAMPLE);
    const product = result.products[0];

    expect(product.title).toBe("Test Book Title");
    expect(product.subtitle).toBe("A Comprehensive Guide");
  });

  it("should parse multiple contributors", () => {
    const result = parser.parse(ONIX_31_SAMPLE);
    const product = result.products[0];

    expect(product.contributors).toHaveLength(2);
    expect(product.contributors[0].keyNames).toBe("Smith");
    expect(product.contributors[0].namesBeforeKey).toBe("John");
    expect(product.contributors[1].keyNames).toBe("Doe");
  });

  it("should parse publishing status", () => {
    const result = parser.parse(ONIX_31_SAMPLE);
    const product = result.products[0];

    expect(product.publishingStatus).toBe("04");
  });

  it("should parse publication date", () => {
    const result = parser.parse(ONIX_31_SAMPLE);
    const product = result.products[0];

    expect(product.publicationDate).not.toBeNull();
    expect(product.publicationDate?.getFullYear()).toBe(2025);
    expect(product.publicationDate?.getMonth()).toBe(0); // January
    expect(product.publicationDate?.getDate()).toBe(15);
  });

  it("should parse prices", () => {
    const result = parser.parse(ONIX_31_SAMPLE);
    const product = result.products[0];

    expect(product.prices).toHaveLength(1);
    expect(product.prices[0].amount).toBe("19.99");
    expect(product.prices[0].currency).toBe("USD");
  });

  it("should handle parse errors gracefully", () => {
    const result = parser.parse("<invalid>xml</invalid>");
    expect(result.parsingErrors.length).toBeGreaterThan(0);
  });
});

describe("ONIX 3.0 Parser", () => {
  const parser = new ONIX30Parser();

  it("should parse valid ONIX 3.0 message", () => {
    const result = parser.parse(ONIX_30_SAMPLE);

    expect(result.version).toBe("3.0");
    expect(result.products).toHaveLength(1);
  });

  it("should parse product correctly", () => {
    const result = parser.parse(ONIX_30_SAMPLE);
    const product = result.products[0];

    expect(product.isbn13).toBe("9780131103627");
    expect(product.title).toBe("ONIX 3.0 Book");
  });
});

describe("ONIX 2.1 Parser", () => {
  const parser = new ONIX21Parser();

  it("should parse reference tags", () => {
    const result = parser.parse(ONIX_21_REFERENCE_SAMPLE);

    expect(result.version).toBe("2.1");
    expect(result.products).toHaveLength(1);
  });

  it("should parse short tags", () => {
    const result = parser.parse(ONIX_21_SHORT_TAGS_SAMPLE);

    expect(result.version).toBe("2.1");
    expect(result.products).toHaveLength(1);
  });

  it("should extract ISBN from direct element", () => {
    const result = parser.parse(ONIX_21_REFERENCE_SAMPLE);
    const product = result.products[0];

    expect(product.isbn13).toBe("9789876543210");
  });

  it("should parse title from DistinctiveTitle", () => {
    const result = parser.parse(ONIX_21_REFERENCE_SAMPLE);
    const product = result.products[0];

    expect(product.title).toBe("Legacy ONIX Book");
  });

  it("should parse contributor from PersonName", () => {
    const result = parser.parse(ONIX_21_REFERENCE_SAMPLE);
    const product = result.products[0];

    expect(product.contributors).toHaveLength(1);
    // Parser should parse "Robert Johnson" into name parts
    expect(product.contributors[0].keyNames).toBe("Johnson");
  });

  it("should handle short tag contributors", () => {
    const result = parser.parse(ONIX_21_SHORT_TAGS_SAMPLE);
    const product = result.products[0];

    expect(product.contributors).toHaveLength(1);
    expect(product.contributors[0].personNameInverted).toBe("Writer, The");
  });
});

describe("Parser Factory", () => {
  it("should return correct parser for each version", () => {
    expect(getParser("3.1")).toBeInstanceOf(ONIX31Parser);
    expect(getParser("3.0")).toBeInstanceOf(ONIX30Parser);
    expect(getParser("2.1")).toBeInstanceOf(ONIX21Parser);
  });

  it("should throw for unsupported version", () => {
    expect(() => getParser("1.0" as any)).toThrow();
  });

  it("should validate supported versions", () => {
    expect(isVersionSupported("3.1")).toBe(true);
    expect(isVersionSupported("3.0")).toBe(true);
    expect(isVersionSupported("2.1")).toBe(true);
    expect(isVersionSupported("1.0")).toBe(false);
  });
});

// =============================================================================
// Field Mapping Tests
// =============================================================================

describe("Field Mapper", () => {
  const mockProduct: ParsedProduct = {
    recordReference: "TEST-001",
    isbn13: "9780306406157",
    gtin13: "9780306406157",
    title: "Test Title",
    subtitle: "Test Subtitle",
    contributors: [
      {
        sequenceNumber: 1,
        role: "A01",
        personNameInverted: "Smith, John",
        namesBeforeKey: "John",
        keyNames: "Smith",
        corporateName: null,
      },
    ],
    productForm: "BC",
    publishingStatus: "04",
    publicationDate: new Date(2025, 0, 15),
    prices: [{ priceType: "01", amount: "19.99", currency: "USD" }],
    subjects: [
      { schemeIdentifier: "10", code: "FIC000000", headingText: "Fiction" },
    ],
    rawIndex: 0,
  };

  it("should map product to Salina title format", () => {
    const result = mapToSalinaTitle(mockProduct, "tenant-123");

    expect(result.title.title).toBe("Test Title");
    expect(result.title.subtitle).toBe("Test Subtitle");
    expect(result.title.isbn).toBe("9780306406157");
    expect(result.title.publication_status).toBe("published");
    expect(result.title.publication_date).toBe("2025-01-15");
  });

  it("should map contributors", () => {
    const result = mapToSalinaTitle(mockProduct, "tenant-123");

    expect(result.contributors).toHaveLength(1);
    expect(result.contributors[0].firstName).toBe("John");
    expect(result.contributors[0].lastName).toBe("Smith");
    expect(result.contributors[0].role).toBe("author");
  });

  it("should track unmapped fields", () => {
    const result = mapToSalinaTitle(mockProduct, "tenant-123");

    expect(result.unmappedFields.length).toBeGreaterThan(0);
    expect(result.unmappedFields.some((f) => f.name === "ProductForm")).toBe(
      true,
    );
    expect(result.unmappedFields.some((f) => f.name === "Price")).toBe(true);
    expect(result.unmappedFields.some((f) => f.name === "Subject")).toBe(true);
  });

  it("should add validation error for missing ISBN", () => {
    const productNoISBN = { ...mockProduct, isbn13: null };
    const result = mapToSalinaTitle(productNoISBN, "tenant-123");

    expect(result.validationErrors.some((e) => e.field === "isbn")).toBe(true);
  });

  it("should add validation error for missing title", () => {
    const productNoTitle = { ...mockProduct, title: "" };
    const result = mapToSalinaTitle(productNoTitle, "tenant-123");

    expect(result.validationErrors.some((e) => e.field === "title")).toBe(true);
  });
});

describe("Publishing Status Mapping", () => {
  it("should map active status to published", () => {
    expect(mapPublishingStatus("04")).toBe("published");
  });

  it("should map forthcoming to pending", () => {
    expect(mapPublishingStatus("02")).toBe("pending");
  });

  it("should map out of print status", () => {
    expect(mapPublishingStatus("07")).toBe("out_of_print");
  });

  it("should default to draft for unknown status", () => {
    expect(mapPublishingStatus("99")).toBe("draft");
    expect(mapPublishingStatus(null)).toBe("draft");
  });
});

// =============================================================================
// Validation Tests
// =============================================================================

describe("Import Validation", () => {
  it("should validate required ISBN", () => {
    const product: ParsedProduct = {
      recordReference: "TEST",
      isbn13: null,
      gtin13: null,
      title: "Test",
      subtitle: null,
      contributors: [],
      productForm: null,
      publishingStatus: null,
      publicationDate: null,
      prices: [],
      subjects: [],
      rawIndex: 0,
    };

    const errors = validateImportProduct(product);
    expect(errors.some((e) => e.field === "isbn")).toBe(true);
  });

  it("should validate ISBN checksum", () => {
    const product: ParsedProduct = {
      recordReference: "TEST",
      isbn13: "1234567890123", // Invalid checksum
      gtin13: null,
      title: "Test",
      subtitle: null,
      contributors: [],
      productForm: null,
      publishingStatus: null,
      publicationDate: null,
      prices: [],
      subjects: [],
      rawIndex: 0,
    };

    const errors = validateImportProduct(product);
    expect(errors.some((e) => e.message.includes("checksum"))).toBe(true);
  });

  it("should validate required title", () => {
    const product: ParsedProduct = {
      recordReference: "TEST",
      isbn13: "9780306406157",
      gtin13: null,
      title: "",
      subtitle: null,
      contributors: [],
      productForm: null,
      publishingStatus: null,
      publicationDate: null,
      prices: [],
      subjects: [],
      rawIndex: 0,
    };

    const errors = validateImportProduct(product);
    expect(errors.some((e) => e.field === "title")).toBe(true);
  });

  it("should pass valid product", () => {
    // Use a valid ISBN-13 with correct checksum (9780306406157 is valid)
    const product: ParsedProduct = {
      recordReference: "TEST",
      isbn13: "9780306406157",
      gtin13: null,
      title: "Valid Title",
      subtitle: null,
      contributors: [
        {
          sequenceNumber: 1,
          role: "A01",
          personNameInverted: "Author, Test",
          namesBeforeKey: "Test",
          keyNames: "Author",
          corporateName: null,
        },
      ],
      productForm: null,
      publishingStatus: "04",
      publicationDate: new Date(),
      prices: [],
      subjects: [],
      rawIndex: 0,
    };

    const errors = validateImportProduct(product);
    expect(errors).toHaveLength(0);
  });
});

describe("File Constraints Validation", () => {
  it("should reject non-XML files", () => {
    const result = validateFileConstraints({
      name: "data.json",
      size: 1000,
      type: "application/json",
    });
    expect(result.valid).toBe(false);
  });

  it("should reject files over 10MB", () => {
    const result = validateFileConstraints({
      name: "large.xml",
      size: 11 * 1024 * 1024,
      type: "text/xml",
    });
    expect(result.valid).toBe(false);
  });

  it("should reject empty files", () => {
    const result = validateFileConstraints({
      name: "empty.xml",
      size: 0,
      type: "text/xml",
    });
    expect(result.valid).toBe(false);
  });

  it("should accept valid XML files", () => {
    const result = validateFileConstraints({
      name: "valid.xml",
      size: 5000,
      type: "text/xml",
    });
    expect(result.valid).toBe(true);
  });
});

describe("Product Count Validation", () => {
  it("should reject zero products", () => {
    const result = validateProductCount(0);
    expect(result.valid).toBe(false);
  });

  it("should reject over 500 products", () => {
    const result = validateProductCount(501);
    expect(result.valid).toBe(false);
  });

  it("should accept valid product count", () => {
    const result = validateProductCount(100);
    expect(result.valid).toBe(true);
  });
});

describe("Duplicate ISBN Detection", () => {
  it("should detect duplicate ISBNs", () => {
    const mappedTitles: MappedTitle[] = [
      {
        title: {
          title: "Book 1",
          subtitle: null,
          isbn: "9780306406157",
          publication_status: "draft",
          publication_date: null,
        },
        contributors: [],
        unmappedFields: [],
        validationErrors: [],
        rawIndex: 0,
      },
      {
        title: {
          title: "Book 2",
          subtitle: null,
          isbn: "9780306406157",
          publication_status: "draft",
          publication_date: null,
        },
        contributors: [],
        unmappedFields: [],
        validationErrors: [],
        rawIndex: 1,
      },
    ];

    const errors = checkDuplicateISBNs(mappedTitles);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("isbn");
  });

  it("should allow unique ISBNs", () => {
    const mappedTitles: MappedTitle[] = [
      {
        title: {
          title: "Book 1",
          subtitle: null,
          isbn: "9780306406157",
          publication_status: "draft",
          publication_date: null,
        },
        contributors: [],
        unmappedFields: [],
        validationErrors: [],
        rawIndex: 0,
      },
      {
        title: {
          title: "Book 2",
          subtitle: null,
          isbn: "9780131103627",
          publication_status: "draft",
          publication_date: null,
        },
        contributors: [],
        unmappedFields: [],
        validationErrors: [],
        rawIndex: 1,
      },
    ];

    const errors = checkDuplicateISBNs(mappedTitles);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// Encoding Tests
// =============================================================================

describe("Encoding Handler", () => {
  it("should handle UTF-8 encoded content", () => {
    const utf8Content =
      '<?xml version="1.0" encoding="UTF-8"?><test>Hello</test>';
    const buffer = new TextEncoder().encode(utf8Content).buffer;
    const result = detectAndConvertEncoding(buffer);
    expect(result).toContain("Hello");
  });

  it("should handle UTF-8 BOM", () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const content = new TextEncoder().encode("<test>BOM test</test>");
    const combined = new Uint8Array(bom.length + content.length);
    combined.set(bom);
    combined.set(content, bom.length);

    const result = detectAndConvertEncoding(combined.buffer);
    expect(result).toContain("BOM test");
  });
});

// =============================================================================
// Name Parsing Tests (Contact Deduplication Support)
// =============================================================================

import { calculateEqualSplit, parseName } from "@/modules/onix/parser/actions";

describe("Name Parsing (Contact Deduplication)", () => {
  it("should parse full name into first and last name", async () => {
    const result = await parseName("John Smith");
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Smith");
  });

  it("should handle single name as last name only", async () => {
    const result = await parseName("Madonna");
    expect(result.firstName).toBe("");
    expect(result.lastName).toBe("Madonna");
  });

  it("should handle empty string", async () => {
    const result = await parseName("");
    expect(result.firstName).toBe("");
    expect(result.lastName).toBe("Unknown");
  });

  it("should handle multiple first names", async () => {
    const result = await parseName("Mary Jane Watson");
    expect(result.firstName).toBe("Mary Jane");
    expect(result.lastName).toBe("Watson");
  });

  it("should handle extra whitespace", async () => {
    const result = await parseName("  John   Smith  ");
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Smith");
  });

  it("should handle hyphenated last names", async () => {
    const result = await parseName("Sarah Connor-Reese");
    expect(result.firstName).toBe("Sarah");
    expect(result.lastName).toBe("Connor-Reese");
  });

  it("should handle suffixes as part of last name", async () => {
    const result = await parseName("John Smith Jr.");
    expect(result.firstName).toBe("John Smith");
    expect(result.lastName).toBe("Jr.");
  });
});

// =============================================================================
// Ownership Percentage Calculation Tests
// =============================================================================

describe("Ownership Percentage Calculation", () => {
  it("should return empty array for no contacts", async () => {
    const result = await calculateEqualSplit([]);
    expect(result).toHaveLength(0);
  });

  it("should give single contact 100%", async () => {
    const result = await calculateEqualSplit(["contact-1"]);
    expect(result).toHaveLength(1);
    expect(result[0].contactId).toBe("contact-1");
    expect(result[0].percentage).toBe("100.00");
    expect(result[0].isPrimary).toBe(true);
  });

  it("should split evenly between two contacts", async () => {
    const result = await calculateEqualSplit(["contact-1", "contact-2"]);
    expect(result).toHaveLength(2);
    expect(result[0].percentage).toBe("50.00");
    expect(result[1].percentage).toBe("50.00");
    expect(result[0].isPrimary).toBe(true);
    expect(result[1].isPrimary).toBe(false);
  });

  it("should handle three-way split with remainder", async () => {
    const result = await calculateEqualSplit(["c1", "c2", "c3"]);
    expect(result).toHaveLength(3);
    // 100 / 3 = 33.33 each, remainder 0.01 goes to last
    expect(result[0].percentage).toBe("33.33");
    expect(result[1].percentage).toBe("33.33");
    expect(result[2].percentage).toBe("33.34");
    // First is primary
    expect(result[0].isPrimary).toBe(true);
    expect(result[1].isPrimary).toBe(false);
    expect(result[2].isPrimary).toBe(false);
  });

  it("should handle five-way split with remainder", async () => {
    const result = await calculateEqualSplit(["c1", "c2", "c3", "c4", "c5"]);
    expect(result).toHaveLength(5);
    // 100 / 5 = 20.00 each, no remainder
    expect(result[0].percentage).toBe("20.00");
    expect(result[4].percentage).toBe("20.00");
  });

  it("should handle seven-way split (non-divisible)", async () => {
    const result = await calculateEqualSplit([
      "c1",
      "c2",
      "c3",
      "c4",
      "c5",
      "c6",
      "c7",
    ]);
    expect(result).toHaveLength(7);
    // 100 / 7 = 14.28, total = 99.96, remainder = 0.04
    // Last contact gets remainder
    expect(result[0].percentage).toBe("14.28");
    expect(result[6].percentage).toBe("14.32"); // 14.28 + 0.04

    // Verify total is exactly 100
    const total = result.reduce((sum, r) => sum + parseFloat(r.percentage), 0);
    expect(total).toBeCloseTo(100, 2);
  });
});

// =============================================================================
// Conflict Resolution Type Tests
// =============================================================================

import type {
  ConflictResolution,
  ConflictResolutionEntry,
} from "@/modules/onix/parser/types";

describe("Conflict Resolution Types", () => {
  it("should support simple resolution strings", () => {
    const resolution: ConflictResolution = "skip";
    expect(resolution).toBe("skip");
  });

  it("should support resolution entry with new ISBN", () => {
    const entry: ConflictResolutionEntry = {
      resolution: "create-new",
      newIsbn: "9780306406157",
    };
    expect(entry.resolution).toBe("create-new");
    expect(entry.newIsbn).toBe("9780306406157");
  });

  it("should support resolution entry without new ISBN", () => {
    const entry: ConflictResolutionEntry = {
      resolution: "update",
    };
    expect(entry.resolution).toBe("update");
    expect(entry.newIsbn).toBeUndefined();
  });
});
