/**
 * ONIX 2.1 Short Tag Mapping
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 4: Implement ONIX 2.1 parser (AC: 2, 3)
 *
 * Maps ONIX 2.1 short tags to reference tags.
 * Reference: EDItEUR ONIX 2.1 specification Appendix A
 */

/**
 * Comprehensive short tag to reference tag mapping
 * Based on EDItEUR ONIX 2.1 specification
 */
export const SHORT_TAG_MAP: Record<string, string> = {
  // ==========================================================================
  // Message Header
  // ==========================================================================
  m172: "FromSAN",
  m173: "FromEANNumber",
  m174: "FromCompany",
  m175: "FromPerson",
  m176: "FromEmail",
  m177: "ToSAN",
  m178: "ToEANNumber",
  m179: "ToCompany",
  m180: "ToPerson",
  m181: "ToEmail",
  m182: "SentDate",
  m183: "MessageNote",

  // ==========================================================================
  // Product Record
  // ==========================================================================
  a001: "RecordReference",
  a002: "NotificationType",
  a194: "DeletionCode",
  a195: "DeletionText",
  a196: "RecordSourceType",
  a197: "RecordSourceIdentifierType",
  a198: "RecordSourceIdentifier",
  a199: "RecordSourceName",

  // ==========================================================================
  // Product Identification
  // ==========================================================================
  b004: "ISBN",
  b005: "EAN13",
  b006: "ProductForm",
  b007: "ProductFormDetail",
  b008: "BookFormDetail",
  b012: "ProductPackaging",
  b013: "ProductFormDescription",
  b014: "NumberOfPieces",
  b018: "DistinguishingFeatureType",
  b019: "DistinguishingFeatureValue",

  // Product Identifier composite
  b221: "ProductIDType",
  b233: "IDTypeName",
  b244: "IDValue",

  // ==========================================================================
  // Title
  // ==========================================================================
  b025: "ProductContentType",
  b026: "DistinctiveTitle",
  b027: "TitlePrefix",
  b028: "TitleWithoutPrefix",
  b029: "TitleType",
  b030: "AbbreviatedLength",
  b031: "TextCaseFlag",
  b203: "TitleText",
  b029a: "TitleType", // Alias

  // ==========================================================================
  // Contributor
  // ==========================================================================
  b034: "ContributorRole",
  b035: "PersonName",
  b036: "PersonNameInverted",
  b037: "NamesBeforeKey",
  b038: "KeyNames",
  b039: "NamesAfterKey",
  b040: "LettersAfterNames",
  b041: "TitlesBeforeNames",
  b042: "TitlesAfterNames",
  b043: "SuffixToKey",
  b044: "PrefixToKey",
  b045: "CorporateName",
  b046: "BiographicalNote",
  b047: "CorporateName", // Alias
  b048: "ContributorDescription",
  b049: "UnnamedPersons",
  b050: "SequenceNumber",
  b051: "SequenceNumberWithinRole",
  b052: "ContributorStatement",

  // ==========================================================================
  // Edition
  // ==========================================================================
  b056: "EditionTypeCode",
  b057: "EditionNumber",
  b058: "EditionStatement",
  b059: "ReligiousTextIdentifier",

  // ==========================================================================
  // Language
  // ==========================================================================
  b062: "LanguageOfText",
  b063: "LanguageRole",
  b252: "LanguageCode",

  // ==========================================================================
  // Subject
  // ==========================================================================
  b064: "BICMainSubject",
  b065: "BICSubjectCode",
  b066: "BICVersion",
  b067: "SubjectSchemeIdentifier",
  b068: "SubjectSchemeVersion",
  b069: "SubjectCode",
  b070: "SubjectHeadingText",
  b069a: "BASICMainSubject", // Alias

  // ==========================================================================
  // Audience
  // ==========================================================================
  b073: "AudienceCode",
  b074: "AudienceRangeQualifier",
  b075: "AudienceRangePrecision",
  b076: "AudienceRangeValue",
  b077: "AudienceDescription",

  // ==========================================================================
  // Extent
  // ==========================================================================
  b061: "NumberOfPages",
  b218: "ExtentType",
  b219: "ExtentValue",
  b220: "ExtentUnit",

  // ==========================================================================
  // Other Text
  // ==========================================================================
  d101: "TextTypeCode",
  d102: "TextFormat",
  d103: "Text",
  d104: "TextLinkType",
  d105: "TextLink",
  d106: "TextAuthor",
  d107: "TextSourceCorporate",
  d108: "TextSourceTitle",
  d109: "TextPublicationDate",
  d110: "StartDate",
  d111: "EndDate",

  // ==========================================================================
  // Publisher
  // ==========================================================================
  b081: "PublisherName",
  b082: "PublisherRole",
  b083: "NameCodeType",
  b084: "NameCodeTypeName",
  b085: "NameCodeValue",
  b086: "ImprintName",

  // ==========================================================================
  // Publishing Status
  // ==========================================================================
  b394: "PublishingStatus",
  b395: "PublishingStatusNote",
  b003: "PublicationDate",
  b086a: "CopyrightYear",
  b087: "YearFirstPublished",

  // ==========================================================================
  // Price
  // ==========================================================================
  j141: "EpubType",
  j142: "EpubTypeVersion",
  j143: "EpubTypeDescription",
  j144: "EpubFormat",
  j145: "EpubTypeNote",
  j148: "SupplyToCountry",
  j149: "ReturnsCodeType",
  j150: "ReturnsCode",
  j151: "PriceTypeCode",
  j152: "PriceAmount",
  j153: "CurrencyCode",
  j154: "PriceEffectiveFrom",
  j155: "PriceEffectiveUntil",
  j160: "DiscountCoded",
  j161: "DiscountCodeType",
  j162: "DiscountCodeTypeName",
  j163: "DiscountCode",
  j164: "DiscountPercent",
  j165: "TaxRateCode1",
  j166: "TaxRatePercent1",
  j167: "TaxableAmount1",
  j168: "TaxAmount1",
  j169: "TaxRateCode2",
  j170: "TaxRatePercent2",
  j171: "TaxableAmount2",
  j172: "TaxAmount2",
  j173: "PriceTypeQualifier",
  j174: "PriceQualifier",
  j266: "PricePer",
  j267: "MinimumOrderQuantity",
  j268: "BatchBonus",

  // ==========================================================================
  // Supply Detail
  // ==========================================================================
  j135: "SupplierName",
  j136: "SupplierRole",
  j137: "SupplierIDType",
  j138: "IDTypeName",
  j139: "IDValue",
  j140: "SupplyStatus",
  j142a: "AvailabilityCode",
  j143a: "AvailabilityStatusCode",
  j144a: "ProductAvailability",
  j145a: "ExpectedShipDate",
  j146: "OnSaleDate",
  j147: "OrderTime",
  j191: "PackQuantity",
  j192: "AudienceRestrictionFlag",
  j193: "AudienceRestrictionNote",

  // ==========================================================================
  // Sales Rights
  // ==========================================================================
  b089: "SalesRightsType",
  b090: "RightsCountry",
  b091: "RightsTerritory",
  b388: "RightsRegion",

  // ==========================================================================
  // Measure
  // ==========================================================================
  c093: "MeasureTypeCode",
  c094: "Measurement",
  c095: "MeasureUnitCode",

  // ==========================================================================
  // Related Products
  // ==========================================================================
  h208: "RelationCode",
  h209: "ProductFormDetail",

  // ==========================================================================
  // Market Representation
  // ==========================================================================
  j401: "AgentName",
  j402: "AgentRole",
  j403: "MarketCountry",
  j404: "MarketTerritory",

  // ==========================================================================
  // Sales Restriction
  // ==========================================================================
  b381: "SalesRestrictionType",
  b382: "SalesRestrictionDetail",
};

/**
 * Expands ONIX 2.1 short tags to reference tags in XML
 *
 * This function replaces short tags (like <a001>, <b004>) with their
 * full reference tag names (like <RecordReference>, <ISBN>).
 *
 * @param xml - The ONIX XML string with short tags
 * @returns XML string with expanded reference tags
 */
export function expandShortTags(xml: string): string {
  let result = xml;

  // Sort by length (longest first) to avoid partial replacements
  const sortedTags = Object.entries(SHORT_TAG_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  );

  for (const [short, reference] of sortedTags) {
    // Replace opening tags: <short> or <short attributes>
    const openRegex = new RegExp(`<${short}(\\s|>)`, "gi");
    result = result.replace(openRegex, `<${reference}$1`);

    // Replace closing tags: </short>
    const closeRegex = new RegExp(`</${short}>`, "gi");
    result = result.replace(closeRegex, `</${reference}>`);
  }

  return result;
}

/**
 * Detects if XML uses ONIX 2.1 short tags
 *
 * @param xml - The ONIX XML string to check
 * @returns true if short tags are detected
 */
export function hasShortTags(xml: string): boolean {
  // Check for common short tags in the first 2000 characters
  const header = xml.slice(0, 2000);

  // Check for patterns like <a001>, <b004>, <j151>, etc.
  const shortTagPattern = /<[a-jm]\d{3}>/i;
  return shortTagPattern.test(header);
}

/**
 * Gets the reference tag name for a short tag
 *
 * @param shortTag - The short tag (without angle brackets)
 * @returns Reference tag name or undefined if not found
 */
export function getReferenceTag(shortTag: string): string | undefined {
  return SHORT_TAG_MAP[shortTag.toLowerCase()];
}
