/**
 * ONIX Message Builder Tests
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 * Task 2: Implement ONIXMessageBuilder class
 *
 * Tests for ONIX 3.1 message generation including header, products, and all blocks.
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { Contact } from "@/db/schema/contacts";
import { ONIXMessageBuilder } from "@/modules/onix/builder/message-builder";
import type { TitleWithAuthors } from "@/modules/title-authors/queries";
import type { TitleAuthorWithContact } from "@/modules/title-authors/types";

// Mock contact factory
function createMockContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact1",
    tenant_id: "550e8400-e29b-41d4-a716-446655440000",
    first_name: "F. Scott",
    last_name: "Fitzgerald",
    email: "scott@example.com",
    phone: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
    tax_id: null,
    tin_encrypted: null,
    tin_type: null,
    tin_last_four: null,
    is_us_based: true,
    w9_received: false,
    w9_received_date: null,
    payment_info: null,
    notes: null,
    status: "active",
    portal_user_id: null,
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
    created_by: null,
    ...overrides,
  };
}

// Mock title author factory
function createMockTitleAuthor(
  overrides: Partial<TitleAuthorWithContact> = {},
  contactOverrides: Partial<Contact> = {},
): TitleAuthorWithContact {
  return {
    id: "auth1",
    title_id: "660e8400-e29b-41d4-a716-446655440001",
    contact_id: "contact1",
    ownership_percentage: "100.00",
    is_primary: true,
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
    created_by: null,
    contact: createMockContact(contactOverrides),
    ...overrides,
  };
}

// Mock tenant data
const mockTenant = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Acme Publishing",
  email: "contact@acme.com",
  subdomain: "acme",
  default_currency: "USD",
};

// Mock title with authors
const mockTitleWithAuthors: TitleWithAuthors = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  title: "The Great Gatsby",
  subtitle: "A Novel",
  isbn: "9781234567890",
  tenant_id: mockTenant.id,
  publication_status: "published",
  created_at: new Date("2025-01-01"),
  updated_at: new Date("2025-01-01"),
  authors: [createMockTitleAuthor()],
  primaryAuthor: null,
  isSoleAuthor: true,
};

// Mock title with co-authors
const mockTitleWithCoAuthors: TitleWithAuthors = {
  ...mockTitleWithAuthors,
  id: "770e8400-e29b-41d4-a716-446655440002",
  title: "Co-Authored Book",
  authors: [
    createMockTitleAuthor(
      {
        id: "auth1",
        title_id: "770e8400-e29b-41d4-a716-446655440002",
        contact_id: "contact1",
        ownership_percentage: "60.00",
        is_primary: true,
      },
      {
        id: "contact1",
        first_name: "Jane",
        last_name: "Smith",
        email: "jane@example.com",
      },
    ),
    createMockTitleAuthor(
      {
        id: "auth2",
        title_id: "770e8400-e29b-41d4-a716-446655440002",
        contact_id: "contact2",
        ownership_percentage: "40.00",
        is_primary: false,
      },
      {
        id: "contact2",
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
      },
    ),
  ],
  isSoleAuthor: false,
};

// Mock title without subtitle
const mockTitleNoSubtitle: TitleWithAuthors = {
  ...mockTitleWithAuthors,
  id: "990e8400-e29b-41d4-a716-446655440004",
  subtitle: null,
};

// Mock title with special characters
const mockTitleSpecialChars: TitleWithAuthors = {
  ...mockTitleWithAuthors,
  id: "aa0e8400-e29b-41d4-a716-446655440005",
  title: "Tom & Jerry's <Adventures>",
};

describe("ONIXMessageBuilder", () => {
  let builder: ONIXMessageBuilder;

  beforeEach(() => {
    builder = new ONIXMessageBuilder(mockTenant.id, mockTenant);
  });

  describe("Header generation", () => {
    it("generates valid ONIX 3.1 message root", () => {
      const xml = builder.toXML();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<ONIXMessage release="3.1"');
      expect(xml).toContain('xmlns="http://ns.editeur.org/onix/3.1/reference"');
    });

    it("includes sender name from tenant", () => {
      const xml = builder.toXML();
      expect(xml).toContain(`<SenderName>${mockTenant.name}</SenderName>`);
    });

    it("includes SentDateTime", () => {
      const xml = builder.toXML();
      expect(xml).toMatch(/<SentDateTime>\d{8}T\d{6}Z<\/SentDateTime>/);
    });

    it("includes default language code (eng)", () => {
      const xml = builder.toXML();
      expect(xml).toContain(
        "<DefaultLanguageOfText>eng</DefaultLanguageOfText>",
      );
    });

    it("includes default currency from tenant", () => {
      const xml = builder.toXML();
      expect(xml).toContain(
        `<DefaultCurrencyCode>${mockTenant.default_currency}</DefaultCurrencyCode>`,
      );
    });
  });

  describe("Product generation", () => {
    it("generates product when title is added", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<Product>");
      expect(xml).toContain("</Product>");
    });

    it("generates unique RecordReference with tenant subdomain", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain(
        `<RecordReference>${mockTenant.subdomain}-${mockTitleWithAuthors.id}</RecordReference>`,
      );
    });

    it("includes NotificationType 03 (new)", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<NotificationType>03</NotificationType>");
    });

    it("includes ISBN-13 identifier (ProductIDType 15)", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<ProductIDType>15</ProductIDType>");
      expect(xml).toContain(`<IDValue>${mockTitleWithAuthors.isbn}</IDValue>`);
    });

    it("includes GTIN-13 identifier (ProductIDType 03)", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<ProductIDType>03</ProductIDType>");
    });
  });

  describe("DescriptiveDetail (Block 1)", () => {
    it("includes ProductComposition (00 = single-item)", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<ProductComposition>00</ProductComposition>");
    });

    it("includes ProductForm (BC = Paperback)", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<ProductForm>BC</ProductForm>");
    });

    it("includes TitleDetail with TitleType 01", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<TitleType>01</TitleType>");
    });

    it("includes TitleElementLevel 01 (product level)", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<TitleElementLevel>01</TitleElementLevel>");
    });

    it("includes title text", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain(
        `<TitleText>${mockTitleWithAuthors.title}</TitleText>`,
      );
    });

    it("includes subtitle when present", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain(
        `<Subtitle>${mockTitleWithAuthors.subtitle}</Subtitle>`,
      );
    });

    it("omits subtitle when null", () => {
      builder.addTitle(mockTitleNoSubtitle);
      const xml = builder.toXML();
      expect(xml).not.toContain("<Subtitle>");
    });
  });

  describe("Contributor handling", () => {
    it("includes contributor with role A01 (author)", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<ContributorRole>A01</ContributorRole>");
    });

    it("includes PersonNameInverted (LastName, FirstName)", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain(
        "<PersonNameInverted>Fitzgerald, F. Scott</PersonNameInverted>",
      );
    });

    it("includes NamesBeforeKey and KeyNames", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<NamesBeforeKey>F. Scott</NamesBeforeKey>");
      expect(xml).toContain("<KeyNames>Fitzgerald</KeyNames>");
    });

    it("includes multiple contributors for co-authored titles", () => {
      builder.addTitle(mockTitleWithCoAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<SequenceNumber>1</SequenceNumber>");
      expect(xml).toContain("<SequenceNumber>2</SequenceNumber>");
      expect(xml).toContain(
        "<PersonNameInverted>Smith, Jane</PersonNameInverted>",
      );
      expect(xml).toContain(
        "<PersonNameInverted>Doe, John</PersonNameInverted>",
      );
    });
  });

  describe("PublishingDetail (Block 4)", () => {
    it("includes Publisher with role 01", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<PublishingRole>01</PublishingRole>");
    });

    it("includes publisher name from tenant", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain(
        `<PublisherName>${mockTenant.name}</PublisherName>`,
      );
    });

    it("includes PublishingStatus (04 = Active)", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<PublishingStatus>04</PublishingStatus>");
    });

    it("includes PublishingDate", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<PublishingDateRole>01</PublishingDateRole>");
      expect(xml).toMatch(/<Date>\d{8}<\/Date>/);
    });
  });

  describe("ProductSupply (Block 6)", () => {
    it("includes Market element", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<Market>");
    });

    it("includes territory with CountriesIncluded", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<CountriesIncluded>US</CountriesIncluded>");
    });

    it("includes SupplyDetail", () => {
      builder.addTitle(mockTitleWithAuthors);
      const xml = builder.toXML();
      expect(xml).toContain("<SupplyDetail>");
      expect(xml).toContain("<ProductAvailability>20</ProductAvailability>");
    });
  });

  describe("XML escaping", () => {
    it("escapes special characters in title", () => {
      builder.addTitle(mockTitleSpecialChars);
      const xml = builder.toXML();
      expect(xml).toContain("Tom &amp; Jerry&apos;s &lt;Adventures&gt;");
    });
  });

  describe("Multiple products", () => {
    it("can add multiple titles to same message", () => {
      builder.addTitle(mockTitleWithAuthors);
      builder.addTitle(mockTitleWithCoAuthors);
      const xml = builder.toXML();

      // Count Product elements
      const productMatches = xml.match(/<Product>/g);
      expect(productMatches?.length).toBe(2);
    });
  });
});
