/**
 * ONIX Field Mapper
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 2: Implement ONIX 3.1 parser (AC: 3)
 *
 * Maps parsed ONIX products to Salina title schema fields.
 * Only maps fields that exist in the titles table.
 */

import type { PublicationStatus } from "@/db/schema/titles";
import type {
  FieldValidationError,
  MappedContributor,
  MappedTitle,
  ParsedProduct,
  UnmappedField,
} from "./types";

/**
 * Codelist 17: Contributor Role mapping to simple roles
 */
const CONTRIBUTOR_ROLE_MAP: Record<string, string> = {
  A01: "author",
  A02: "author", // With
  A03: "author", // Screenplay by
  A04: "author", // Libretto by
  A05: "author", // Lyrics by
  A06: "author", // By (composer)
  A07: "author", // By (artist)
  A08: "author", // By (photographer)
  A09: "author", // Created by
  A10: "author", // From an idea by
  A11: "author", // Designed by
  A12: "author", // Illustrated by
  A13: "author", // Photographs by
  A14: "author", // Text by
  A15: "author", // Preface by
  A16: "author", // Prologue by
  A17: "author", // Summary by
  A18: "author", // Supplement by
  A19: "author", // Afterword by
  A20: "author", // Notes by
  A21: "author", // Commentaries by
  A22: "author", // Epilogue by
  A23: "author", // Foreword by
  A24: "author", // Introduction by
  A25: "author", // Footnotes by
  A26: "author", // Memoir by
  A27: "author", // Experiments by
  A29: "author", // Introduction and notes by
  A30: "author", // Software written by
  A31: "author", // Book and lyrics by
  A32: "author", // Contributions by
  A33: "author", // Appendix by
  A34: "author", // Index by
  A35: "author", // Drawings by
  A36: "author", // Cover design or artwork by
  A37: "author", // Preliminary work by
  A38: "author", // Original author
  A39: "author", // Maps by
  A40: "author", // Inked or colored by
  A41: "author", // Pop-ups by
  A42: "author", // Continued by
  A43: "author", // Interviewer
  A44: "author", // Interviewee
  B01: "editor",
  B02: "editor", // Revised by
  B03: "editor", // Retold by
  B04: "editor", // Abridged by
  B05: "editor", // Adapted by
  B06: "translator",
  B07: "author", // As told by
  B08: "translator", // Translated with commentary by
  B09: "editor", // Series edited by
  B10: "editor", // Edited and translated by
  B11: "editor", // Editor-in-chief
  B12: "editor", // Guest editor
  B13: "editor", // Volume editor
  B14: "editor", // Editorial board member
  B15: "editor", // Editorial coordination by
  B16: "editor", // Managing editor
  B17: "editor", // Founded by
  B18: "editor", // Prepared for publication by
  B19: "editor", // Associate editor
  B20: "editor", // Consultant editor
  B21: "editor", // General editor
  B22: "editor", // Dramatized by
  B23: "editor", // General rapporteur
  B24: "editor", // Literary editor
  B25: "editor", // Arranged by (music)
  B26: "editor", // Technical editor
  B27: "editor", // Thesis advisor
  B28: "editor", // Thesis examiner
  B29: "editor", // Scientific editor
  B30: "editor", // Historical advisor
  B31: "editor", // Original editor
  D01: "narrator", // Producer
  D02: "narrator", // Director
  D03: "narrator", // Conductor
  E01: "narrator", // Actor
  E02: "narrator", // Dancer
  E03: "narrator", // Narrator
  E04: "narrator", // Commentator
  E05: "narrator", // Vocal soloist
  E06: "narrator", // Instrumental soloist
  E07: "narrator", // Read by
  E08: "narrator", // Performed by
  E99: "narrator", // Performed by (orchestra, band, ensemble)
  Z01: "other", // Assisted by
  Z02: "other", // Honored/dedicated to
  Z98: "other", // Various roles
  Z99: "other", // Other
};

/**
 * Codelist 64: Publishing Status mapping to Salina publication_status
 */
const PUBLISHING_STATUS_MAP: Record<string, PublicationStatus> = {
  "00": "draft", // Unspecified
  "01": "draft", // Cancelled
  "02": "pending", // Forthcoming
  "03": "pending", // Postponed indefinitely
  "04": "published", // Active
  "05": "draft", // No longer our product
  "06": "out_of_print", // Out of stock indefinitely
  "07": "out_of_print", // Out of print
  "08": "draft", // Inactive
  "09": "draft", // Unknown
  "10": "draft", // Remaindered
  "11": "draft", // Withdrawn from sale
  "12": "draft", // Recalled
  "13": "pending", // Active, but not sold separately
  "14": "pending", // Temporarily withdrawn from sale
  "15": "pending", // Not available
  "16": "draft", // Not available, reason unspecified
  "17": "pending", // Not sold as set
};

/**
 * Map ONIX publishing status to Salina publication_status
 */
export function mapPublishingStatus(
  onixStatus: string | null,
): PublicationStatus {
  if (!onixStatus) return "draft";
  return PUBLISHING_STATUS_MAP[onixStatus] || "draft";
}

/**
 * Map parsed ONIX product to Salina title format
 *
 * @param product - Parsed ONIX product
 * @param tenantId - Tenant ID for the import
 * @returns Mapped title with contributors and validation info
 */
export function mapToSalinaTitle(
  product: ParsedProduct,
  tenantId: string,
): MappedTitle {
  const errors: FieldValidationError[] = [];
  const unmapped: UnmappedField[] = [];

  // Validate required fields
  if (!product.isbn13) {
    errors.push({
      field: "isbn",
      message: "ISBN-13 is required for import",
    });
  }

  if (!product.title || product.title.trim() === "") {
    errors.push({
      field: "title",
      message: "Title is required",
    });
  }

  // Map publishing status
  const publicationStatus = mapPublishingStatus(product.publishingStatus);

  // Track unmapped fields (fields parsed but not stored in titles schema)
  if (product.productForm) {
    unmapped.push({
      name: "ProductForm",
      value: product.productForm,
      reason: "No format field in titles schema",
    });
  }

  if (product.prices.length > 0) {
    const firstPrice = product.prices[0];
    if (firstPrice.amount && firstPrice.currency) {
      unmapped.push({
        name: "Price",
        value: `${firstPrice.amount} ${firstPrice.currency}`,
        reason: "No price field in titles schema",
      });
    }
  }

  if (product.subjects.length > 0) {
    const firstSubject = product.subjects[0];
    const subjectValue =
      firstSubject.code ||
      firstSubject.headingText ||
      `Scheme ${firstSubject.schemeIdentifier}`;
    unmapped.push({
      name: "Subject",
      value: subjectValue,
      reason: "No subject field in titles schema",
    });
  }

  // Map contributors
  const contributors = mapContributors(product);

  // Format publication date
  let publicationDateStr: string | null = null;
  if (product.publicationDate) {
    publicationDateStr = product.publicationDate.toISOString().split("T")[0];
  }

  return {
    title: {
      tenant_id: tenantId,
      title: product.title,
      subtitle: product.subtitle,
      isbn: product.isbn13,
      publication_status: publicationStatus,
      publication_date: publicationDateStr,
    },
    contributors,
    unmappedFields: unmapped,
    validationErrors: errors,
    rawIndex: product.rawIndex,
  };
}

/**
 * Map ONIX contributors to Salina format
 */
function mapContributors(product: ParsedProduct): MappedContributor[] {
  return product.contributors.map((c) => {
    // Extract name parts
    let firstName: string | null = null;
    let lastName: string | null = null;

    if (c.namesBeforeKey && c.keyNames) {
      firstName = c.namesBeforeKey;
      lastName = c.keyNames;
    } else if (c.personNameInverted) {
      // Parse "Last, First" format
      const parts = c.personNameInverted.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        lastName = parts[0];
        firstName = parts.slice(1).join(" ");
      } else {
        lastName = c.personNameInverted;
      }
    } else if (c.corporateName) {
      // Corporate name goes in lastName
      lastName = c.corporateName;
    }

    // Map role code to simple role
    const simpleRole = CONTRIBUTOR_ROLE_MAP[c.role] || "author";

    return {
      firstName,
      lastName,
      role: simpleRole,
      sequenceNumber: c.sequenceNumber,
    };
  });
}

/**
 * Convert mapped title to preview format for UI
 */
export function toPreviewProduct(mapped: MappedTitle): {
  index: number;
  recordReference: string;
  isbn: string | null;
  title: string;
  subtitle: string | null;
  contributors: { name: string; role: string }[];
  publicationStatus: string | null;
  publicationDate: string | null;
  productForm: string | null;
  price: string | null;
  subject: string | null;
  validationErrors: FieldValidationError[];
  unmappedFields: UnmappedField[];
  hasConflict: boolean;
  conflictTitleId: string | null;
  conflictTitleName: string | null;
} {
  // Format contributor names
  const contributors = mapped.contributors.map((c) => {
    const name =
      c.firstName && c.lastName
        ? `${c.firstName} ${c.lastName}`
        : c.lastName || c.firstName || "Unknown";
    return { name, role: c.role };
  });

  // Extract display-only fields from unmapped
  const productFormField = mapped.unmappedFields.find(
    (f) => f.name === "ProductForm",
  );
  const priceField = mapped.unmappedFields.find((f) => f.name === "Price");
  const subjectField = mapped.unmappedFields.find((f) => f.name === "Subject");

  return {
    index: mapped.rawIndex,
    recordReference: "", // Set by caller
    isbn: mapped.title.isbn,
    title: mapped.title.title,
    subtitle: mapped.title.subtitle,
    contributors,
    publicationStatus: mapped.title.publication_status,
    publicationDate: mapped.title.publication_date,
    productForm: productFormField?.value || null,
    price: priceField?.value || null,
    subject: subjectField?.value || null,
    validationErrors: mapped.validationErrors,
    unmappedFields: mapped.unmappedFields,
    hasConflict: false, // Set by conflict detection
    conflictTitleId: null, // Set by conflict detection
    conflictTitleName: null, // Set by conflict detection
  };
}

/**
 * Extract unique unmapped field names from a batch of mapped titles
 */
export function collectUnmappedFields(mappedTitles: MappedTitle[]): string[] {
  const fieldNames = new Set<string>();

  for (const mapped of mappedTitles) {
    for (const field of mapped.unmappedFields) {
      fieldNames.add(field.name);
    }
  }

  return Array.from(fieldNames).sort();
}
