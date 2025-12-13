/**
 * ONIX Schema Validator Tests
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 7: Unit tests for schema validator
 *
 * Tests structural validation of ONIX 3.1 XML messages.
 */

import { describe, expect, it } from "vitest";
import { validateStructure } from "@/modules/onix/validator/schema-validator";

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
      <IDValue>9780123456789</IDValue>
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

describe("Structural Validator", () => {
  it("validates well-formed ONIX 3.1 XML", async () => {
    const xml = buildValidONIXMessage();
    const result = await validateStructure(xml);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects malformed XML", async () => {
    const xml = "<ONIXMessage><Invalid></ONIXMessage>";
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe("schema");
    expect(result.errors[0].code).toBe("XML_MALFORMED");
  });

  it("rejects completely invalid XML", async () => {
    const xml = "not xml at all";
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe("schema");
  });

  it("rejects XML missing ONIXMessage root", async () => {
    const xml = '<?xml version="1.0"?><SomeOtherRoot></SomeOtherRoot>';
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_ROOT" }),
    );
  });

  it("rejects XML missing required Header", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Product>
    <RecordReference>test-001</RecordReference>
  </Product>
</ONIXMessage>`;
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_HEADER" }),
    );
  });

  it("rejects Header missing SenderName", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender></Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780123456789</IDValue>
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
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_SENDER_NAME" }),
    );
  });

  it("rejects Header missing SentDateTime", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender>
      <SenderName>Test Publisher</SenderName>
    </Sender>
  </Header>
  <Product>
    <RecordReference>test-001</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780123456789</IDValue>
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
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_SENT_DATE" }),
    );
  });

  it("rejects XML with no Product elements", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender>
      <SenderName>Test Publisher</SenderName>
    </Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
</ONIXMessage>`;
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "NO_PRODUCTS" }),
    );
  });

  it("rejects Product missing RecordReference", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
  <Header>
    <Sender>
      <SenderName>Test Publisher</SenderName>
    </Sender>
    <SentDateTime>20241213T120000Z</SentDateTime>
  </Header>
  <Product>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780123456789</IDValue>
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
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_RECORDREFERENCE" }),
    );
  });

  it("rejects Product missing DescriptiveDetail", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
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
      <IDValue>9780123456789</IDValue>
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
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_DESCRIPTIVEDETAIL" }),
    );
  });

  it("validates multiple products", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
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
      <IDValue>9780123456789</IDValue>
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
    <RecordReference>test-002</RecordReference>
    <NotificationType>03</NotificationType>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9780123456790</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
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
    const result = await validateStructure(xml);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("provides correct path for errors in specific products", async () => {
    const xml = `<?xml version="1.0"?>
<ONIXMessage>
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
      <IDValue>9780123456789</IDValue>
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
      <IDValue>9780123456790</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>
      <ProductForm>BC</ProductForm>
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
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    // Error should reference Product[1] (second product, 0-indexed)
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "MISSING_RECORDREFERENCE",
        path: expect.stringContaining("Product[1]"),
      }),
    );
  });
});
