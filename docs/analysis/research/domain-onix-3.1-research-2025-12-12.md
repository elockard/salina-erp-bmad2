---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
workflowType: 'research'
lastStep: 4
status: 'complete'
research_type: 'domain'
research_topic: 'ONIX 3.1 implementation requirements for book publishers'
research_goals: 'Building ONIX generator for Epic 14, understanding validation requirements, mapping Salina title fields to ONIX elements, creating developer reference documentation'
user_name: 'Eric'
date: '2025-12-12'
web_research_enabled: true
source_verification: true
---

# ONIX 3.1 Implementation Requirements for Book Publishers

**Research Type:** Domain Research
**Date:** 2025-12-12
**Prepared for:** Salina ERP Phase 3 - Epic 14 (ONIX 3.1 Core)

---

## Domain Research Scope Confirmation

**Research Topic:** ONIX 3.1 implementation requirements for book publishers

**Research Goals:**
- Building the ONIX generator in Epic 14
- Understanding validation requirements
- Mapping Salina title fields to ONIX elements
- Creating developer reference documentation

**Domain Research Scope:**

- Standard Structure - ONIX 3.1 message architecture, required vs optional elements
- EDItEUR Codelists - Subject codes, contributor roles, product forms, availability codes
- Accessibility Requirements - EPUB Accessibility metadata, European Accessibility Act compliance
- Channel Requirements - Ingram/Amazon/Bowker specific ONIX acceptance criteria
- Validation Standards - Schema validation, business rule validation, common rejection reasons
- Implementation Patterns - Best practices, field mapping strategies, versioning

**Research Methodology:**

- All claims verified against current public sources
- Multi-source validation for critical domain claims
- Confidence level framework for uncertain information
- Comprehensive domain coverage with industry-specific insights

**Scope Confirmed:** 2025-12-12

---

## Industry Analysis

### Overview: What is ONIX for Books?

ONIX (ONline Information eXchange) for Books is the **international standard for representing and communicating book industry product information (metadata) in electronic form**. It is an XML-based format designed for rich book metadata, providing a consistent way for publishers, retailers, and their supply chain partners to communicate a wide range of information about their products globally.

**Key Characteristics:**
- XML-based with DTD, XSD, and RNG schema support
- Controlled vocabularies (codelists) with standardized terminology
- Supports complete records and granular "block updates"
- Free to implement under permissive license (no registration or royalty fees)
- Overtly a commercial data format designed for global use

_Source: [EDItEUR ONIX Overview](https://www.editeur.org/83/Overview/)_

### Market Adoption and Geographic Reach

ONIX for Books is the **oldest and most widely adopted** member of the ONIX family of standards. It has been adopted in approximately **16 countries** across:

| Region | Adoption Status |
|--------|-----------------|
| **North America** | Widely implemented (US, Canada) |
| **Europe** | Widely implemented (UK, Germany, France, Netherlands, etc.) |
| **Australasia** | Widely implemented (Australia, New Zealand) |
| **Asia Pacific** | Growing adoption |
| **South America** | Growing adoption |

**Adoption Statistics:**
- A decade-old BISG survey reported only 40% of respondents using ONIX 3.0 at that time
- Adoption is now reported to be **much higher** but exact figures are unavailable
- Many retailers have not yet updated from version 2.1 to 3.0 [High Confidence]

_Source: [Wikipedia - ONIX for Books](https://en.wikipedia.org/wiki/ONIX_for_Books), [EDItEUR Overview](https://www.editeur.org/83/Overview/)_

### Version History and Evolution

| Version | Release Date | Status | Notes |
|---------|--------------|--------|-------|
| **1.0** | January 2000 | Obsolete | Initial release by AAP and EDItEUR |
| **2.0-2.1** | 2001-2003 | **Sunsetted 2014, Deprecated 2023** | Long-standing version, no longer supported |
| **3.0** | April 2009 | Current (legacy) | Major rewrite, 8 minor revisions (3.0.1-3.0.8) |
| **3.0.8** | Mid-2021 | Current (legacy) | Final 3.0 revision |
| **3.1** | March 2023 | **Current recommended** | More granular price/availability updates |
| **3.1.1** | March 2024 | Current | Minor revision |
| **3.1.2** | October 2024 | **Latest** | Current specification with Codelists Issue 71 |

_Source: [EDItEUR ONIX 3.0/3.1](https://www.editeur.org/12/About-Release-3.0-and-3.1/), [Library of Congress](https://www.loc.gov/preservation/digital/formats/fdd/fdd000488.shtml)_

### Industry Transition Pressures

**Critical Deadline: Amazon ONIX 3 Mandate**

Amazon has set a deadline of **March 2026** for full conversion to ONIX 3. This is forcing the publishing industry to transition from ONIX 2.1.

> "A publisher literally cannot sell their books at retail, particularly online retail, without ONIX metadata. Publishers cannot upload a book for sale to Amazon without ONIX metadata — Amazon will not accept the upload. ONIX metadata is not a nice-to-have, it's a must-have."

_Source: [The Future of Publishing - ONIX 3 Debacle](https://thefutureofpublishing.com/2025/11/book-publishing-technology-the-onix-3-debacle/)_

**European Accessibility Act (EAA) Compliance**

The transition to ONIX 3 is also becoming a **legal necessity**:

- **Effective Date:** June 28, 2025
- **Requirement:** All eBooks sold in the EU must be accompanied by accessibility metadata describing accessible features
- **Standard:** W3C WCAG 2.1 and EPUB Accessibility 1.1 guidelines
- **Enforcement:** Penalties determined by each EU Member State
- **ONIX 2.1 Limitation:** Cannot communicate many newer legal requirements for GPSR or EAA

_Source: [BISG - EAA is Coming](https://www.bisg.org/news/have-you-heard-the-eaa-is-coming), [Fondazione LIA](https://www.fondazionelia.org/en/research-and-development/european-accessibility-act-requirements-are-publishing-standards-as-epub-onix-and-schema-org-fully-compliant/)_

### Key Industry Players and Standards Bodies

| Organization | Role |
|--------------|------|
| **EDItEUR** | International standards body that maintains ONIX; coordinates development with BISG and BIC |
| **BISG** (Book Industry Study Group) | US-based industry group; co-developer of ONIX; publishes Best Practices for Product Metadata |
| **BIC** (Book Industry Communication) | UK-based industry group; co-developer of ONIX; publishes BIC Product Metadata Guidelines |
| **Fondazione LIA** | Italian foundation focused on accessible publishing; provides EAA guidance |
| **W3C Publishing CG** | Publishes accessibility metadata display guidelines |

_Source: [EDItEUR](https://www.editeur.org/), [BIC](https://bic.org.uk/resources/onix-for-books/)_

### Business Value of ONIX

A **2016 Nielsen study** demonstrated the relationship between improved metadata and increased book sales. Key benefits include:

- **Reduced support costs** through single data feeds to multiple partners
- **Improved discoverability** through standardized subject codes and keywords
- **Faster time-to-market** with automated data distribution
- **Reduced errors** through validation against schema and codelists
- **Global reach** through international standard adoption

_Source: [EDItEUR Overview](https://www.editeur.org/83/Overview/)_

---

## Technical Structure: ONIX 3.1 Message Architecture

### Message Components

An ONIX for Books message has four component parts:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. XML Declaration (<?xml version="1.0"?>)                  │
├─────────────────────────────────────────────────────────────┤
│ 2. Header Block (mandatory, non-repeating)                  │
│    - Sender identification (mandatory)                      │
│    - Message date (mandatory)                               │
│    - Addressee (optional)                                   │
│    - Default values: language, price type, currency         │
├─────────────────────────────────────────────────────────────┤
│ 3. Product Records (1 to unlimited)                         │
│    - Record identifiers                                     │
│    - Blocks 1-6 (detailed below)                            │
├─────────────────────────────────────────────────────────────┤
│ 4. End of Message                                           │
└─────────────────────────────────────────────────────────────┘
```

_Source: [EDItEUR ONIX 3.0 Introduction](https://www.editeur.org/files/ONIX%203/Introduction_to_ONIX_for_Books_3.0.2.pdf)_

### Product Record Block Structure

Each Product record contains up to **six blocks** of information:

| Block | Name | Required | Repeatable | Contents |
|-------|------|----------|------------|----------|
| **Block 1** | DescriptiveDetail | **Yes** | No | Product form, title, contributors, subjects, extent |
| **Block 2** | CollateralDetail | No | No | Descriptions, cover images, reviews, prizes |
| **Block 3** | ContentDetail | No | No | Table of contents, chapter-level metadata |
| **Block 4** | PublishingDetail | **Yes** | No | Publisher, imprint, publishing status, dates |
| **Block 5** | RelatedMaterial | No | No | Related products, works, resources |
| **Block 6** | ProductSupply | **Yes** (for sales) | **Yes** | Markets, suppliers, prices, availability |

**Key Rule:** Blocks 1-5 occur once only. Block 6 is repeatable (once per market).

_Source: [ONIX 3.0 Specification](https://www.hanmoto.com/pub/onix/ONIX_for_Books_Format_Specification_3.0.2.html)_

### Mandatory Elements Summary

#### Always Required (Every Product Record)

| Element | Location | Description |
|---------|----------|-------------|
| `<RecordReference>` | Product | Unique ID for this record (not the product) |
| `<NotificationType>` | Product | Type of notification (03 = new/update) |
| `<ProductIdentifier>` | Product | At least one, typically ISBN-13 |
| `<DescriptiveDetail>` | Block 1 | Product description block |
| `<ProductComposition>` | Block 1 | Single-item (00) or multi-item |
| `<ProductForm>` | Block 1 | Physical form code (e.g., BB = hardback) |
| `<TitleDetail>` | Block 1 | Title information |
| `<PublishingDetail>` | Block 4 | Publishing information block |

#### Required for Distribution/Sales

| Element | Location | Description |
|---------|----------|-------------|
| `<ProductSupply>` | Block 6 | Market and supply information |
| `<SupplyDetail>` | Block 6 | Supplier details |
| `<ProductAvailability>` | Block 6 | Availability code |
| `<Price>` | Block 6 | Pricing information |

_Source: [Google Play ONIX Requirements](https://support.google.com/books/partner/answer/6374180?hl=en)_

### ProductIdentifier Structure

Every product requires at least one `<ProductIdentifier>`:

```xml
<ProductIdentifier>
  <ProductIDType>15</ProductIDType>  <!-- 15 = ISBN-13 -->
  <IDValue>9781234567890</IDValue>
</ProductIdentifier>
```

**Common ProductIDType Codes:**

| Code | Type | Notes |
|------|------|-------|
| 02 | ISBN-10 | Deprecated, use ISBN-13 |
| 03 | GTIN-13 | Required by many channels |
| 15 | ISBN-13 | **Recommended primary identifier** |
| 01 | Proprietary | Publisher's internal ID |

_Source: [EDItEUR Codelist 5](https://ns.editeur.org/onix/en/5)_

### TitleDetail Structure

```xml
<TitleDetail>
  <TitleType>01</TitleType>  <!-- 01 = Distinctive title -->
  <TitleElement>
    <TitleElementLevel>01</TitleElementLevel>  <!-- 01 = Product level -->
    <TitleText>The Great Gatsby</TitleText>
    <Subtitle>A Novel</Subtitle>
  </TitleElement>
</TitleDetail>
```

**TitleType 01** (distinctive title) is **required** for every book. Other title types are optional.

_Source: [BookNet Canada - TitleDetail](https://www.booknetcanada.ca/blog/2020/9/30/grouping-products-in-onix-title-detail-and-title-element-composites)_

### ProductSupply and Pricing Structure (Block 6)

```xml
<ProductSupply>
  <Market>
    <Territory>
      <CountriesIncluded>US CA</CountriesIncluded>
    </Territory>
  </Market>
  <SupplyDetail>
    <Supplier>
      <SupplierRole>01</SupplierRole>  <!-- Publisher -->
      <SupplierName>Example Publisher</SupplierName>
    </Supplier>
    <ProductAvailability>20</ProductAvailability>  <!-- Available -->
    <Price>
      <PriceType>01</PriceType>  <!-- RRP excluding tax -->
      <PriceAmount>24.99</PriceAmount>
      <CurrencyCode>USD</CurrencyCode>
    </Price>
  </SupplyDetail>
</ProductSupply>
```

**Block 6 Repeats:** One `<ProductSupply>` per market (e.g., US, UK, EU).

_Source: [BookNet Canada - Markets and Supply](https://www.booknetcanada.ca/blog/2015/9/22/onix-21-to-30-transition-markets-and-supply)_

---

## Accessibility Metadata (Codelist 196)

### EAA Compliance Requirements

For European Accessibility Act compliance, eBooks must include accessibility metadata using **Codelist 196** within `<ProductFormFeature>`:

```xml
<ProductFormFeature>
  <ProductFormFeatureType>09</ProductFormFeatureType>  <!-- Accessibility -->
  <ProductFormFeatureValue>04</ProductFormFeatureValue>  <!-- EPUB Accessibility 1.1 -->
</ProductFormFeature>
<ProductFormFeature>
  <ProductFormFeatureType>09</ProductFormFeatureType>
  <ProductFormFeatureValue>81</ProductFormFeatureValue>  <!-- WCAG 2.1 -->
</ProductFormFeature>
<ProductFormFeature>
  <ProductFormFeatureType>09</ProductFormFeatureType>
  <ProductFormFeatureValue>85</ProductFormFeatureValue>  <!-- Level AA -->
</ProductFormFeature>
```

### Key Codelist 196 Values

| Code | Meaning |
|------|---------|
| **02** | EPUB Accessibility 1.0 Level A |
| **03** | EPUB Accessibility 1.0 Level AA |
| **04** | EPUB Accessibility 1.1 |
| **10** | No accessibility options disabled |
| **12** | Index navigation available |
| **36** | All textual content modifiable |
| **80** | WCAG 2.0 conformance |
| **81** | WCAG 2.1 conformance |
| **82** | WCAG 2.2 conformance |
| **84** | WCAG Level A |
| **85** | WCAG Level AA |
| **86** | WCAG Level AAA |
| **75** | EAA Exception: Micro-enterprise |
| **76** | EAA Exception: Disproportionate burden |
| **94** | Accessibility compliance web page URL |

_Source: [DAISY Codelist 196](https://kb.daisy.org/publishing/docs/metadata/onix/index.html), [Inclusive Publishing](https://inclusivepublishing.org/publisher/metadata/)_

---

## ONIX Implementation Tools

### Commercial Software

| Tool | Vendor | Capabilities |
|------|--------|--------------|
| **ONIXEDIT** | ONIXEDIT Inc. | Windows desktop, ONIX 2.1/3.0/3.1, validation, export |
| **ONIXEDIT Server** | ONIXEDIT Inc. | Client/server database, multi-user, catalog management |
| **Eloquence** | Firebrand | Enterprise title management, ONIX generation |
| **CoreSource** | Data Conversion Lab | Metadata management, ONIX output |
| **BiblioCore** | Firebrand | Title management with ONIX |

_Source: [ONIXEDIT](https://onixedit.com/en-us), [Firebrand](https://firebrandtech.com/solutions/eloquence/onix/)_

### Open Source / Libraries

| Library | Language | Notes |
|---------|----------|-------|
| **Jonix** | Java | ONIX parsing library |
| **onix-parser** | Python | Basic ONIX parsing |
| **onixcheck** | Python | CLI validation tool for 2.1/3.0/3.1 |
| **Various XSD validators** | Any | Schema validation tools |

_Source: [GitHub - onixcheck](https://github.com/titusz/onixcheck)_

---

## Channel-Specific Requirements

### Ingram Content Group

| Requirement | Specification |
|-------------|---------------|
| **Preferred Format** | ONIX 3.0 (ONIX 3.1 supported) |
| **Delivery Methods** | FTP, CD-ROM, DVD, thumb drive, email |
| **Lead Time** | 6 months before publication (preferred), minimum 2 weeks before buy session |
| **Image Format** | Named by EAN (13 digits), e.g., `9781234567890.jpg` |
| **Corrections** | ONIX or Ingram Excel format; email datafix@ingramcontent.com for 1-2 minor fixes |
| **Contact** | datafix@ingramcontent.com |

**Key Points:**
- Ingram prefers ONIX 3.0 International format
- Bibliographic data and images should arrive 6 months before pub date
- FTP packages available as flat text or ONIX files
- Daily stock updates, weekly bibliographic updates via FTP

_Source: [Ingram IQ Data Requirements](https://ingram-iq.zendesk.com/hc/en-us/articles/5279400117133-IBG-Data-and-Image-Requirements), [Ingram Data Services FAQ](https://www.ingramcontent.com/retailers-page/data-services-faq)_

### Amazon (KDP / Advantage / P2K)

| Requirement | Specification |
|-------------|---------------|
| **ONIX Versions** | 3.0, 3.0.1-3.0.8, **3.1** (newly supported) |
| **Accessibility** | Full ONIX 3.1 accessibility metadata support (Codelist 196) |
| **EAA Compliance** | Required by June 28, 2025 for EU sales |
| **Keywords** | 7 keywords max, 500 characters total |
| **Title/Subtitle** | Combined < 200 characters |
| **Deadline** | ONIX 3 required by **March 2026** (ONIX 2.1 rejected) |

**Key Points:**
- P2K (Publisher to Kindle) now supports ONIX 3.1
- Accessibility metadata can be submitted via ONIX 3.1, Excel template, or P2K interface
- W3C Display Techniques for ONIX Accessibility Metadata 2.0 implementation
- Traditional publishers typically use ONIX; KDP interface for self-publishers

_Source: [Fondazione LIA - Amazon ONIX 3.1](https://www.fondazionelia.org/en/whats-new/amazon-kindle-will-ingest-accessibility-metadata-following-the-onix-3-1-standards/), [KDP Metadata Guidelines](https://kdp.amazon.com/en_US/help/topic/G201097560)_

### Bowker (Books In Print)

| Requirement | Specification |
|-------------|---------------|
| **Formats Accepted** | ASCII, ONIX 2.1, ONIX 3.0 |
| **Delivery** | FTP files |
| **Identifier** | ISBN-13, EAN, or UPC required |
| **Image Format** | 400x400 JPEG, named by ISBN-13 (e.g., `9780123456789.jpg`) |
| **Cost** | Free to submit data |
| **Reach** | 3,000+ subscribers to Books In Print |

**Key Points:**
- Bibliographic file contains up to 164 fields
- Data submission is free (increases discoverability)
- Larger publishers use ONIX; smaller publishers can use other formats

_Source: [Bowker Data Feeds](https://bowkerbookdata.proquest.com/data-feeds), [MyIdentifiers FAQ](https://www.myidentifiers.com/faq/data-file-submissions)_

### Google Play Books

| Requirement | Specification |
|-------------|---------------|
| **ONIX Versions** | 3.0 and 3.1 |
| **Required Blocks** | Blocks 1, 4, and 6 (full record) |
| **ProductIdentifier** | ISBN-13 (ProductIDType 15) recommended |
| **ProductSupply** | Required to sell on Google Play |

_Source: [Google Play ONIX Requirements](https://support.google.com/books/partner/answer/6374180?hl=en)_

---

## Common Validation Errors and Pitfalls

### Critical Errors That Invalidate ONIX Files

| Error | Description | Solution |
|-------|-------------|----------|
| **Version Mismatch** | Using ONIX 3.0 codelist values in 2.1 file | Use codelists matching your ONIX version (Issue 36 for 2.1) |
| **Missing Mandatory Elements** | Missing Publisher, Summary, Publication Date, Page Count | Ensure all required elements are populated |
| **Invalid RecordReference** | Duplicate RecordReference for different products | Use unique, persistent RecordReference per product |
| **Empty Tags** | `<Tag></Tag>` or `<Tag/>` for missing data | Omit entire element if no data (don't send empty) |
| **Character Encoding** | Non-UTF-8 encoding causing garbled text | Always use UTF-8 encoding |
| **Invalid Links** | Broken URLs for images, reviews, author sites | Validate all URLs before including |
| **Invalid Subject Codes** | BISAC code doesn't match SubjectSchemeIdentifier | Verify codes against official BISAC list |

_Source: [BookNet Canada - What Invalidates ONIX](https://www.booknetcanada.ca/blog/2020/5/15/what-invalidates-an-onix-file), [EDItEUR - Twelve ONIX Problems](https://www.editeur.org/files/ONIX%203/APPNOTE%20Twelve%20ONIX%20problems.pdf)_

### Schema Validation vs. Business Rule Validation

| Type | What It Checks | Tools |
|------|----------------|-------|
| **Well-Formed XML** | Valid XML syntax, proper nesting | Any XML parser |
| **Schema Valid** | Matches ONIX XSD/RNG schema | XSD validators, onixcheck |
| **Business Valid** | Logical rules, codelist values, dependencies | Custom validation, ONIXEDIT |

**Important:** A file can be schema-valid but still contain business logic errors (wrong codelist values, illogical combinations).

_Source: [BookNet Canada - DIY Schema Validation](https://booknetcanada.atlassian.net/wiki/spaces/UserDocs/pages/1379658/DIY+Schema+Validation+for+Workmanlike+ONIX)_

---

## Key Codelists for Implementation

### Essential Codelists

| Codelist | Name | Use |
|----------|------|-----|
| **List 5** | Product Identifier Type | ISBN-10 (02), GTIN-13 (03), ISBN-13 (15) |
| **List 15** | Title Type | Distinctive (01), ONIX reference (11) |
| **List 17** | Contributor Role | Author (A01), Illustrator (A12), Editor (B01), Translator (B06) |
| **List 27** | Subject Scheme Identifier | BISAC (10), BIC (12), Thema (93) |
| **List 65** | Product Availability | Available (20), Not yet available (10), Out of print (40) |
| **List 150** | Product Form | Hardback (BB), Paperback (BC), PDF (EA), EPUB (ED) |
| **List 196** | E-publication Accessibility | See Accessibility section above |

_Source: [EDItEUR Codelists](https://ns.editeur.org/onix), [OCLC ONIX Advice](https://help.oclc.org/Librarian_Toolbox/Resources_for_providers_and_OCLC_partners/OCLC_advice_for_ONIX_providers)_

### BISAC Subject Codes

- Maximum 3 BISAC codes per product
- Most specific code first, marked as `<MainSubject/>`
- 2023 BISAC list available at [bisg.org](https://www.bisg.org/complete-bisac-subject-headings-list)

_Source: [BISG BISAC FAQ](https://www.bisg.org/BISAC-FAQ)_

---

## Implementation Recommendations for Epic 14

### Phase 1: Core ONIX Generator (MVP)

| Priority | Feature | Notes |
|----------|---------|-------|
| **P0** | ONIX 3.1 message generation | Header + Product records |
| **P0** | Schema validation (XSD) | Validate before export |
| **P0** | ISBN-13 as primary identifier | ProductIDType 15 |
| **P0** | Required blocks (1, 4, 6) | DescriptiveDetail, PublishingDetail, ProductSupply |
| **P0** | Single-market pricing | US market initially |
| **P1** | Multi-market support | Repeatable Block 6 |
| **P1** | ONIX 3.0 export fallback | For legacy channels |

### Phase 2: Accessibility & Validation

| Priority | Feature | Notes |
|----------|---------|-------|
| **P0** | Codelist 196 accessibility | Required for EAA compliance |
| **P0** | Business rule validation | Beyond schema validation |
| **P1** | Codelist management | Import/update EDItEUR codelists |
| **P1** | BISAC code lookup | Integrate BISAC subject list |

### Phase 3: Import & Advanced Features

| Priority | Feature | Notes |
|----------|---------|-------|
| **P1** | ONIX 2.1 import | Many publishers still on 2.1 |
| **P1** | ONIX 3.0 import | Common current format |
| **P2** | Block updates | Granular price/availability updates |
| **P2** | Channel-specific profiles | Pre-configured for Ingram, Amazon |

### Salina Title → ONIX Field Mapping (Draft)

| Salina Field | ONIX Element | Codelist |
|--------------|--------------|----------|
| `title.isbn` | `<ProductIdentifier>/<IDValue>` | List 5 (15) |
| `title.title` | `<TitleDetail>/<TitleElement>/<TitleText>` | List 15 (01) |
| `title.subtitle` | `<TitleDetail>/<TitleElement>/<Subtitle>` | - |
| `title.format` | `<ProductForm>` | List 150 |
| `title.pageCount` | `<Extent>/<ExtentValue>` | List 23 (00) |
| `title.publicationDate` | `<PublishingDate>/<Date>` | List 163 (01) |
| `title.price` | `<Price>/<PriceAmount>` | List 58 |
| `title.bisacCode` | `<Subject>/<SubjectCode>` | List 27 (10) |
| `contact.name` (author) | `<Contributor>/<PersonName>` | List 17 (A01) |
| `tenant.name` | `<Publisher>/<PublisherName>` | List 45 (01) |

---

## References and Resources

### Official Documentation
- [EDItEUR ONIX Overview](https://www.editeur.org/83/Overview/)
- [ONIX 3.0/3.1 Downloads](https://www.editeur.org/93/Release-3.0-Downloads/)
- [EDItEUR Codelists Browser](https://ns.editeur.org/onix)
- [ONIX 3.1 Introduction (PDF)](https://editeur.org/files/ONIX%203/Introduction_to_ONIX_for_Books_3.1.1.pdf)

### Best Practices Guides
- [BISG Best Practices for Product Metadata](https://www.bisg.org/)
- [BIC Product Metadata Guidelines](https://bic.org.uk/resources/onix-for-books/)
- [ONIX Global Best Practice Guide](https://www.hanmoto.com/pub/onix/ONIX_for_Books_Global_Best_Practice_3.0.2.html)

### Accessibility Resources
- [DAISY ONIX Accessibility Metadata](https://kb.daisy.org/publishing/docs/metadata/onix/index.html)
- [W3C Display Techniques for ONIX Accessibility](https://www.w3.org/community/reports/publishingcg/CG-FINAL-onix-techniques-20250422/)
- [Fondazione LIA - EAA Compliance](https://www.fondazionelia.org/en/research-and-development/european-accessibility-act-requirements-are-publishing-standards-as-epub-onix-and-schema-org-fully-compliant/)

### Channel Documentation
- [Ingram Data Requirements](https://ingram-iq.zendesk.com/hc/en-us/articles/5279400117133-IBG-Data-and-Image-Requirements)
- [Amazon KDP Metadata Guidelines](https://kdp.amazon.com/en_US/help/topic/G201097560)
- [Google Play ONIX Requirements](https://support.google.com/books/partner/answer/6374180?hl=en)
- [Bowker Data Feeds](https://bowkerbookdata.proquest.com/data-feeds)

---

## Executive Summary

### Key Findings

1. **ONIX 3.1 is the correct choice** for Salina ERP - it's the current EDItEUR standard, supports accessibility metadata required for EAA compliance, and is backwards-compatible with 3.0.

2. **Critical deadlines are driving adoption:**
   - **June 28, 2025** - European Accessibility Act requires accessibility metadata for EU eBook sales
   - **March 2026** - Amazon mandates ONIX 3 (rejecting 2.1)

3. **Channel requirements are converging** on ONIX 3.0/3.1 - Ingram, Amazon, Google, and Bowker all support it.

4. **Implementation complexity is manageable:**
   - Required elements are well-documented
   - Schema validation catches most structural errors
   - Codelists are maintained by EDItEUR and updated quarterly

5. **Market opportunity exists** - Many publishers are still on ONIX 2.1 and need migration assistance.

### Recommended Next Steps

1. **Architect Review** - Winston should review this research for Tech Spec updates
2. **Field Mapping** - Complete Salina title → ONIX mapping document
3. **XSD Integration** - Download ONIX 3.1.2 XSD for validation implementation
4. **Codelist Strategy** - Plan for codelist management and updates
5. **Channel Profiles** - Define channel-specific output configurations

---

*Research conducted: 2025-12-12*
*Prepared by: Mary (Business Analyst)*
*For: Salina ERP Phase 3 - Epic 14 (ONIX 3.1 Core)*

