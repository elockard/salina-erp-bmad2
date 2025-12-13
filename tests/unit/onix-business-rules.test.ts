/**
 * ONIX Business Rules Validator Tests
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 7: Unit tests for business rule validator
 *
 * Tests business rule validation of ONIX 3.1 messages.
 */

import { describe, expect, it } from "vitest";
import {
  validateBusinessRules,
  validateISBN13,
} from "@/modules/onix/validator/business-rules";

// Test helper: Build a valid minimal ONIX message
function buildValidONIXMessage(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.1">
  <Header>
    <Sender>
      <SenderName>Test Publisher</SenderName>
    </Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780134685991</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test Book Title</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test Publisher</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
    <ProductSupply>
      <SupplyDetail>
        <Price>
          <PriceAmount>29.99</PriceAmount>
          <CurrencyCode>USD</CurrencyCode>
        </Price>
      </SupplyDetail>
    </ProductSupply>
  </Product>
</ONIXMessage>`;
}

describe("ISBN-13 Validation", () => {
  it("validates correct ISBN-13", () => {
    // Valid ISBNs
    expect(validateISBN13("9780134685991")).toBe(true);
    expect(validateISBN13("9780061120084")).toBe(true);
    expect(validateISBN13("9780316769488")).toBe(true);
  });

  it("rejects invalid ISBN-13 checksum", () => {
    expect(validateISBN13("9781234567899")).toBe(false); // Invalid checksum
    expect(validateISBN13("9780134685990")).toBe(false); // Off by one
  });

  it("rejects ISBN-13 with wrong length", () => {
    expect(validateISBN13("978013468599")).toBe(false); // 12 digits
    expect(validateISBN13("97801346859912")).toBe(false); // 14 digits
  });

  it("rejects ISBN-13 with non-numeric characters", () => {
    expect(validateISBN13("978013468599X")).toBe(false);
    expect(validateISBN13("978-0134685991")).toBe(false); // With dashes
  });

  it("rejects empty or null ISBN", () => {
    expect(validateISBN13("")).toBe(false);
    expect(validateISBN13(null as unknown as string)).toBe(false);
    expect(validateISBN13(undefined as unknown as string)).toBe(false);
  });
});

describe("Business Rule Validator", () => {
  it("validates a complete valid ONIX message", async () => {
    const xml = buildValidONIXMessage();
    const result = await validateBusinessRules(xml);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("validates missing RecordReference", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780134685991</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_RECORD_REF" }),
    );
  });

  it("validates missing ProductIdentifier", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_IDENTIFIER" }),
    );
  });

  it("validates invalid ISBN-13 checksum", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9781234567899</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_ISBN" }),
    );
  });

  it("validates invalid ProductIDType codelist", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>99</ProductIDType>
      <IDValue>ABC123</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_CODELIST",
        codelistRef: "List 5",
      }),
    );
  });

  it("validates invalid ProductForm codelist", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780134685991</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>ZZ</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_CODELIST",
        codelistRef: "List 150",
      }),
    );
  });

  it("validates missing TitleText", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780134685991</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_TITLE" }),
    );
  });

  it("validates missing DescriptiveDetail", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780134685991</IDValue>
    </ProductIdentifier>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_BLOCK" }),
    );
  });

  it("validates invalid currency code", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780134685991</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
    <ProductSupply>
      <SupplyDetail>
        <Price>
          <PriceAmount>29.99</PriceAmount>
          <CurrencyCode>XXX</CurrencyCode>
        </Price>
      </SupplyDetail>
    </ProductSupply>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_CURRENCY" }),
    );
  });

  it("validates negative price amount", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780134685991</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
    <ProductSupply>
      <SupplyDetail>
        <Price>
          <PriceAmount>-10.00</PriceAmount>
          <CurrencyCode>USD</CurrencyCode>
        </Price>
      </SupplyDetail>
    </ProductSupply>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_PRICE" }),
    );
  });

  it("validates non-numeric price amount", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780134685991</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
    <ProductSupply>
      <SupplyDetail>
        <Price>
          <PriceAmount>not-a-number</PriceAmount>
          <CurrencyCode>USD</CurrencyCode>
        </Price>
      </SupplyDetail>
    </ProductSupply>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_PRICE" }),
    );
  });

  it("allows zero price amount", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780134685991</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
    <ProductSupply>
      <SupplyDetail>
        <Price>
          <PriceAmount>0</PriceAmount>
          <CurrencyCode>USD</CurrencyCode>
        </Price>
      </SupplyDetail>
    </ProductSupply>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    // Zero price should be valid (free book)
    const priceErrors = result.errors.filter((e) => e.code === "INVALID_PRICE");
    expect(priceErrors).toHaveLength(0);
  });

  it("validates multiple products and reports correct paths", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender><SenderName>Test</SenderName></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780134685991</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Book One</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>
  <Product>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9781234567899</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>ZZ</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Book Two</TitleText>
        </TitleElement>
      </TitleDetail>
    </DescriptiveDetail>
    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>
        <PublisherName>Test</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;
    const result = await validateBusinessRules(xml);
    expect(result.valid).toBe(false);

    // First product is valid, second has errors
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "MISSING_RECORD_REF",
        path: expect.stringContaining("Product[1]"),
      }),
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_ISBN",
        path: expect.stringContaining("Product[1]"),
      }),
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_CODELIST",
        codelistRef: "List 150",
        path: expect.stringContaining("Product[1]"),
      }),
    );
  });
});
