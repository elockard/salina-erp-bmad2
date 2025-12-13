/**
 * ONIX Validation Integration Tests
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 7: Integration tests for export with validation
 *
 * Tests the full two-layer validation flow without mocking.
 */

import { describe, expect, it } from "vitest";
import { validateONIXMessage } from "@/modules/onix/validator";

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
  </Product>
</ONIXMessage>`;
}

describe("ONIX Validation Integration", () => {
  describe("two-layer validation flow", () => {
    it("passes both structural and business validation for valid message", async () => {
      const xml = buildValidONIXMessage();
      const result = await validateONIXMessage(xml);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails structural validation first, never reaches business rules", async () => {
      const xml = "<Invalid>not valid xml";
      const result = await validateONIXMessage(xml);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe("schema");
    });

    it("fails business validation after structural passes", async () => {
      // Valid structure but invalid ISBN checksum
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
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
      <IDValue>9780306406158</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test Book</TitleText>
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
  </Product>
</ONIXMessage>`;

      const result = await validateONIXMessage(xml);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === "business")).toBe(true);
      expect(result.errors.some((e) => e.code === "INVALID_ISBN")).toBe(true);
    });

    it("returns all business rule errors in single pass", async () => {
      // Valid structure but multiple business rule violations
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
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
      <ProductIDType>99</ProductIDType>
      <IDValue>invalid</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>ZZ</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test Book</TitleText>
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
          <PriceAmount>10.00</PriceAmount>
          <CurrencyCode>XYZ</CurrencyCode>
        </Price>
      </SupplyDetail>
    </ProductSupply>
  </Product>
</ONIXMessage>`;

      const result = await validateONIXMessage(xml);

      expect(result.valid).toBe(false);
      // Should have multiple business rule errors
      const businessErrors = result.errors.filter((e) => e.type === "business");
      expect(businessErrors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("error details", () => {
    it("provides XPath-style paths for errors", async () => {
      const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender>
      <SenderName>Test</SenderName>
    </Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <NotificationType>03</NotificationType>
  </Product>
</ONIXMessage>`;

      const result = await validateONIXMessage(xml);

      expect(result.valid).toBe(false);
      // Should have path information
      const errorWithPath = result.errors.find((e) =>
        e.path.includes("Product"),
      );
      expect(errorWithPath).toBeDefined();
    });

    it("provides codelist reference for codelist errors", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
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
      <ProductIDType>99</ProductIDType>
      <IDValue>9780306406157</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitleText>Test Book</TitleText>
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
  </Product>
</ONIXMessage>`;

      const result = await validateONIXMessage(xml);

      expect(result.valid).toBe(false);
      const codelistError = result.errors.find(
        (e) => e.code === "INVALID_CODELIST",
      );
      expect(codelistError).toBeDefined();
      expect(codelistError?.codelistRef).toBe("List 5");
    });
  });
});
