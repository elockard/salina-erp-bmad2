# Story 14.2: Implement ONIX Schema Validation

Status: done

## Story

As a **publisher**,
I want **to validate ONIX messages before export**,
so that **I know my data will be accepted by channels**.

## Acceptance Criteria

1. **Given** I generate an ONIX message
   **When** I request validation
   **Then** system validates against ONIX 3.1.2 XSD schema

2. **And** system validates business rules:
   - Required fields populated (RecordReference, ProductIdentifier, Title, etc.)
   - Codelist values match EDItEUR codelists (List 5, 15, 17, 45, 64, 65, 93, 150, 163)
   - Price and currency consistency (valid currency codes, positive prices)
   - ISBN format validation (valid ISBN-13 checksum)

3. **And** validation errors display field-level details:
   - Error type (schema vs business rule)
   - Field path (e.g., Product/DescriptiveDetail/TitleDetail)
   - Expected value or format
   - Codelist reference if applicable

4. **And** I can fix errors and re-validate without re-generating

5. **And** only validated exports are sent to channels (validation gates export)

6. **And** validation results stored in `onix_exports` table with status

## Tasks / Subtasks

- [x] Task 1: Create validator module structure (AC: 1, 2)
  - [x] Install fast-xml-parser: `pnpm add fast-xml-parser`
  - [x] Create `src/modules/onix/validator/` directory
  - [x] Create `schema-validator.ts` for structural validation
  - [x] Create `business-rules.ts` for business rule validation
  - [x] Create validation result types in `src/modules/onix/types.ts`

- [x] Task 2: Implement Structural Validator (AC: 1)
  - [x] Download ONIX 3.1.2 XSD schema from EDItEUR (reference only, store in `schemas/`)
  - [x] Implement `validateStructure()` using fast-xml-parser (serverless-compatible)
  - [x] Validate required elements and structure against ONIX 3.1 spec
  - [x] Return structured errors with element paths

- [x] Task 3: Implement Business Rule Validator (AC: 2)
  - [x] Validate required fields per ONIX 3.1 spec
  - [x] Validate codelist values against embedded lookup tables
  - [x] Validate ISBN-13 format and checksum
  - [x] Validate price/currency consistency
  - [x] Return structured errors with field paths

- [x] Task 4: Create validation action (AC: 4, 5)
  - [x] Add `validateONIXExport` Server Action
  - [x] Integrate two-layer validation (schema then business)
  - [x] Return combined validation results
  - [x] Gate export on validation success

- [x] Task 5: Update export actions with validation (AC: 5, 6)
  - [x] Add validation step to `exportSingleTitle`
  - [x] Add validation step to `exportBatchTitles`
  - [x] Update `onix_exports.status` to include "validation_error"
  - [x] Store validation errors in `onix_exports.error_message`

- [x] Task 6: Build validation UI (AC: 3, 4)
  - [x] Create `ValidationResultsDisplay` component
  - [x] Show field-level errors with paths and descriptions
  - [x] Add "Re-validate" button to preview modal
  - [x] Add validation status indicator to export button

- [x] Task 7: Write tests (all ACs)
  - [x] Unit tests for schema validator
  - [x] Unit tests for business rule validator
  - [x] Unit tests for validation action
  - [x] Integration tests for export with validation

## Dev Notes

### Technical Requirements

**FR Coverage:** FR136

- **FR136:** Publisher can validate ONIX messages against EDItEUR schema and business rules before export

**Permission Required:** `CREATE_AUTHORS_TITLES` (Owner, Admin, Editor roles) - same as export

### Architecture Pattern: Two-Layer Validation

Per `architecture.md:897-912`, implement two-layer validation:

```typescript
// src/modules/onix/validator/index.ts
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  type: "schema" | "business";
  code: string;
  message: string;
  path: string;           // XPath or field path (e.g., "Product[0]/DescriptiveDetail/TitleDetail")
  expected?: string;      // Expected value or format
  actual?: string;        // Actual value found
  codelistRef?: string;   // e.g., "List 5" for ProductIDType
}

export async function validateONIXMessage(xml: string): Promise<ValidationResult> {
  // Layer 1: Structural validation (XML well-formed + required elements)
  const structureResult = await validateStructure(xml);
  if (!structureResult.valid) {
    return structureResult; // Return early - structural errors are blocking
  }

  // Layer 2: Business rule validation (codelists, formats, consistency)
  const businessResult = await validateBusinessRules(xml);
  return businessResult;
}
```

### Structural Validation (Serverless-Compatible)

**Schema Reference:** Download from EDItEUR at https://www.editeur.org/93/Release-3.1-Downloads/

Schema files stored in `schemas/onix/` (NOT public - internal reference only):
- `ONIX_BookProduct_3.1_reference.xsd` - Reference for required elements
- Used to derive validation rules, not for runtime XSD validation

**Implementation: fast-xml-parser (Primary)**

fast-xml-parser is the primary choice because:
- Pure JavaScript - works in serverless/Docker environments (Fly.io)
- No native bindings - reliable deployment
- Sufficient for structural validation + business rules

```typescript
// src/modules/onix/validator/schema-validator.ts
import { XMLParser, XMLValidator } from "fast-xml-parser";

const REQUIRED_ELEMENTS = {
  root: ["ONIXMessage"],
  header: ["Sender", "SentDateTime"],
  sender: ["SenderName"],
  product: ["RecordReference", "NotificationType", "ProductIdentifier", "DescriptiveDetail", "PublishingDetail"],
  descriptiveDetail: ["ProductComposition", "ProductForm", "TitleDetail"],
  titleDetail: ["TitleType", "TitleElement"],
  titleElement: ["TitleElementLevel", "TitleText"],
  publishingDetail: ["Publisher", "PublishingStatus"],
};

export async function validateStructure(xml: string): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  // Step 1: Check XML is well-formed
  const xmlValidation = XMLValidator.validate(xml, {
    allowBooleanAttributes: false,
  });

  if (xmlValidation !== true) {
    return {
      valid: false,
      errors: [{
        type: "schema",
        code: "XML_MALFORMED",
        message: xmlValidation.err.msg,
        path: `Line ${xmlValidation.err.line}`,
      }],
    };
  }

  // Step 2: Parse and validate structure
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const doc = parser.parse(xml);

  // Validate ONIXMessage root
  if (!doc.ONIXMessage) {
    errors.push({
      type: "schema",
      code: "MISSING_ROOT",
      message: "ONIXMessage root element is required",
      path: "/",
    });
    return { valid: false, errors };
  }

  const message = doc.ONIXMessage;

  // Validate Header
  if (!message.Header) {
    errors.push({
      type: "schema",
      code: "MISSING_HEADER",
      message: "Header element is required",
      path: "/ONIXMessage/Header",
    });
  } else {
    if (!message.Header.Sender?.SenderName) {
      errors.push({
        type: "schema",
        code: "MISSING_SENDER_NAME",
        message: "SenderName is required in Header/Sender",
        path: "/ONIXMessage/Header/Sender/SenderName",
      });
    }
    if (!message.Header.SentDateTime) {
      errors.push({
        type: "schema",
        code: "MISSING_SENT_DATE",
        message: "SentDateTime is required in Header",
        path: "/ONIXMessage/Header/SentDateTime",
      });
    }
  }

  // Validate Products
  const products = Array.isArray(message.Product)
    ? message.Product
    : message.Product ? [message.Product] : [];

  if (products.length === 0) {
    errors.push({
      type: "schema",
      code: "NO_PRODUCTS",
      message: "At least one Product element is required",
      path: "/ONIXMessage/Product",
    });
  }

  products.forEach((product, index) => {
    const basePath = `/ONIXMessage/Product[${index}]`;

    // Required product elements
    for (const elem of REQUIRED_ELEMENTS.product) {
      if (!product[elem]) {
        errors.push({
          type: "schema",
          code: `MISSING_${elem.toUpperCase()}`,
          message: `${elem} is required in Product`,
          path: `${basePath}/${elem}`,
        });
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
```

**Alternative: libxmljs2 (Local Development Only)**

⚠️ **WARNING:** libxmljs2 has native bindings that may NOT work in serverless Docker deployments (Fly.io). Only use for local development or dedicated server environments.

```typescript
// OPTIONAL: For local development with full XSD validation
// Requires: pnpm add libxmljs2 (adds ~50MB native dependency)
import libxmljs from "libxmljs2";
import path from "path";
import fs from "fs/promises";

export async function validateAgainstXSD(xml: string): Promise<ValidationResult> {
  const schemaPath = path.join(process.cwd(), "schemas/onix/ONIX_BookProduct_3.1_reference.xsd");
  const schemaDoc = libxmljs.parseXml(await fs.readFile(schemaPath, "utf-8"));
  const xmlDoc = libxmljs.parseXml(xml);

  const isValid = xmlDoc.validate(schemaDoc);

  if (!isValid) {
    const errors = xmlDoc.validationErrors.map(err => ({
      type: "schema" as const,
      code: `XSD_${err.code}`,
      message: err.message,
      path: err.line ? `Line ${err.line}` : "Unknown",
    }));
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}
```

### Business Rule Validation

Implement in `src/modules/onix/validator/business-rules.ts`:

```typescript
import { XMLParser } from "fast-xml-parser";

const CODELIST_VALUES = {
  // List 5: Product Identifier Type
  productIDType: ["03", "15"], // GTIN-13, ISBN-13
  // List 1: Notification Type
  notificationType: ["03"], // New/Update
  // List 2: Product Composition
  productComposition: ["00"], // Single-item
  // List 15: Title Type
  titleType: ["01"], // Distinctive title
  // List 17: Contributor Role
  contributorRole: ["A01", "B01"], // Author, Editor
  // List 45: Publishing Role
  publishingRole: ["01"], // Publisher
  // List 64: Publishing Status
  publishingStatus: ["04"], // Active
  // List 65: Product Availability
  productAvailability: ["20"], // Available
  // List 93: Supplier Role
  supplierRole: ["01"], // Publisher to retailer
  // List 150: Product Form (subset)
  productForm: ["BB", "BC", "BD", "BE", "EA", "EB", "EC", "ED"], // Hardback, Paperback, etc.
  // List 163: Publishing Date Role
  publishingDateRole: ["01"], // Publication date
};

const VALID_CURRENCY_CODES = ["USD", "EUR", "GBP", "CAD", "AUD"];

export async function validateBusinessRules(xml: string): Promise<ValidationResult> {
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml);
  const errors: ValidationError[] = [];

  const products = Array.isArray(doc.ONIXMessage.Product)
    ? doc.ONIXMessage.Product
    : [doc.ONIXMessage.Product];

  products.forEach((product, index) => {
    const basePath = `Product[${index}]`;

    // Validate RecordReference exists
    if (!product.RecordReference) {
      errors.push({
        type: "business",
        code: "MISSING_RECORD_REF",
        message: "RecordReference is required",
        path: `${basePath}/RecordReference`,
      });
    }

    // Validate ProductIdentifier
    const identifiers = Array.isArray(product.ProductIdentifier)
      ? product.ProductIdentifier
      : [product.ProductIdentifier].filter(Boolean);

    if (identifiers.length === 0) {
      errors.push({
        type: "business",
        code: "MISSING_IDENTIFIER",
        message: "At least one ProductIdentifier is required",
        path: `${basePath}/ProductIdentifier`,
      });
    }

    identifiers.forEach((id, idIndex) => {
      // Validate ProductIDType codelist
      if (!CODELIST_VALUES.productIDType.includes(id.ProductIDType)) {
        errors.push({
          type: "business",
          code: "INVALID_CODELIST",
          message: `Invalid ProductIDType value`,
          path: `${basePath}/ProductIdentifier[${idIndex}]/ProductIDType`,
          expected: CODELIST_VALUES.productIDType.join(", "),
          actual: id.ProductIDType,
          codelistRef: "List 5",
        });
      }

      // Validate ISBN-13 checksum if type 15
      if (id.ProductIDType === "15" && !validateISBN13(id.IDValue)) {
        errors.push({
          type: "business",
          code: "INVALID_ISBN",
          message: "Invalid ISBN-13 checksum",
          path: `${basePath}/ProductIdentifier[${idIndex}]/IDValue`,
          actual: id.IDValue,
        });
      }
    });

    // Validate DescriptiveDetail
    const dd = product.DescriptiveDetail;
    if (dd) {
      // ProductForm codelist
      if (!CODELIST_VALUES.productForm.includes(dd.ProductForm)) {
        errors.push({
          type: "business",
          code: "INVALID_CODELIST",
          message: "Invalid ProductForm value",
          path: `${basePath}/DescriptiveDetail/ProductForm`,
          expected: "See List 150",
          actual: dd.ProductForm,
          codelistRef: "List 150",
        });
      }

      // TitleDetail required
      if (!dd.TitleDetail?.TitleElement?.TitleText) {
        errors.push({
          type: "business",
          code: "MISSING_TITLE",
          message: "TitleText is required",
          path: `${basePath}/DescriptiveDetail/TitleDetail/TitleElement/TitleText`,
        });
      }
    } else {
      errors.push({
        type: "business",
        code: "MISSING_BLOCK",
        message: "DescriptiveDetail (Block 1) is required",
        path: `${basePath}/DescriptiveDetail`,
      });
    }

    // Validate ProductSupply pricing
    const ps = product.ProductSupply?.SupplyDetail?.Price;
    if (ps) {
      // Currency code validation
      if (!VALID_CURRENCY_CODES.includes(ps.CurrencyCode)) {
        errors.push({
          type: "business",
          code: "INVALID_CURRENCY",
          message: "Invalid or unsupported currency code",
          path: `${basePath}/ProductSupply/SupplyDetail/Price/CurrencyCode`,
          expected: VALID_CURRENCY_CODES.join(", "),
          actual: ps.CurrencyCode,
        });
      }

      // Price amount must be numeric and non-negative
      const priceAmount = parseFloat(ps.PriceAmount);
      if (isNaN(priceAmount) || priceAmount < 0) {
        errors.push({
          type: "business",
          code: "INVALID_PRICE",
          message: "PriceAmount must be a non-negative number",
          path: `${basePath}/ProductSupply/SupplyDetail/Price/PriceAmount`,
          actual: ps.PriceAmount,
        });
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

function validateISBN13(isbn: string): boolean {
  if (!isbn || isbn.length !== 13 || !/^\d{13}$/.test(isbn)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(isbn[12]);
}
```

### Integration with Existing Export Actions

Update `src/modules/onix/actions.ts`:

```typescript
import { validateONIXMessage } from "./validator";

export async function exportSingleTitle(
  titleId: string,
  options?: { skipValidation?: boolean }
): Promise<ActionResult<ExportResult>> {
  // ... existing code to build XML ...

  // Validate before returning (unless explicitly skipped)
  if (!options?.skipValidation) {
    const validationResult = await validateONIXMessage(xml);

    if (!validationResult.valid) {
      // Store failed export record
      await db.insert(onixExports).values({
        tenant_id: tenantId,
        title_ids: [titleId],
        xml_content: xml,
        product_count: 1,
        status: "validation_error",
        error_message: JSON.stringify(validationResult.errors),
      });

      return {
        success: false,
        error: "ONIX validation failed",
        validationErrors: validationResult.errors,
      };
    }
  }

  // ... rest of existing code ...
}
```

### Standalone Validation Action

Create `validateONIXExport` action for re-validation:

```typescript
// src/modules/onix/actions.ts

export async function validateONIXExport(
  xml: string
): Promise<ActionResult<ValidationResult>> {
  try {
    await requirePermission(CREATE_AUTHORS_TITLES);

    const result = await validateONIXMessage(xml);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { success: false, error: "Permission denied" };
    }
    return { success: false, error: "Validation failed" };
  }
}
```

### UI Component: ValidationResultsDisplay

Create `src/modules/onix/components/validation-results.tsx`:

```typescript
"use client";

import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ValidationError, ValidationResult } from "../types";

interface ValidationResultsDisplayProps {
  result: ValidationResult;
  onRevalidate?: () => void;
  isLoading?: boolean;
}

export function ValidationResultsDisplay({
  result,
  onRevalidate,
  isLoading = false,
}: ValidationResultsDisplayProps) {
  if (result.valid) {
    return (
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Validation Passed</AlertTitle>
        <AlertDescription className="text-green-700">
          ONIX message is valid and ready for export.
        </AlertDescription>
      </Alert>
    );
  }

  const schemaErrors = result.errors.filter(e => e.type === "schema");
  const businessErrors = result.errors.filter(e => e.type === "business");

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Validation Failed</AlertTitle>
        <AlertDescription>
          {result.errors.length} error(s) found. Fix issues and re-validate.
        </AlertDescription>
      </Alert>

      {schemaErrors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Schema Errors</h4>
          {schemaErrors.map((error, i) => (
            <ValidationErrorCard key={i} error={error} />
          ))}
        </div>
      )}

      {businessErrors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Business Rule Errors</h4>
          {businessErrors.map((error, i) => (
            <ValidationErrorCard key={i} error={error} />
          ))}
        </div>
      )}

      {onRevalidate && (
        <Button variant="outline" onClick={onRevalidate} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Validating...
            </>
          ) : (
            "Re-validate"
          )}
        </Button>
      )}
    </div>
  );
}

function ValidationErrorCard({ error }: { error: ValidationError }) {
  return (
    <div className="border rounded-md p-3 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <code className="text-xs bg-muted px-1 rounded">{error.code}</code>
        {error.codelistRef && (
          <Badge variant="outline" className="text-xs">
            {error.codelistRef}
          </Badge>
        )}
      </div>
      <p className="font-medium">{error.message}</p>
      <p className="text-muted-foreground mt-1">
        <span className="font-mono text-xs">{error.path}</span>
      </p>
      {error.expected && (
        <p className="text-muted-foreground text-xs">
          Expected: {error.expected}
        </p>
      )}
      {error.actual && (
        <p className="text-muted-foreground text-xs">
          Actual: {error.actual}
        </p>
      )}
    </div>
  );
}
```

### Update Types

Add to `src/modules/onix/types.ts`:

```typescript
/**
 * Validation error detail
 */
export interface ValidationError {
  type: "schema" | "business";
  code: string;
  message: string;
  path: string;
  expected?: string;
  actual?: string;
  codelistRef?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Extended export result with validation
 */
export interface ExportResultWithValidation extends ExportResult {
  validation?: ValidationResult;
}
```

### File Structure

```
src/modules/onix/
├── index.ts                    # Add validator exports
├── types.ts                    # Add ValidationError, ValidationResult
├── actions.ts                  # Add validateONIXExport, update exports
├── builder/
│   └── ... (existing)
├── validator/                  # NEW
│   ├── index.ts               # Main validateONIXMessage function
│   ├── schema-validator.ts    # Structural validation (fast-xml-parser)
│   ├── business-rules.ts      # Business rule validation
│   └── codelists.ts           # Codelist lookup tables
├── components/
│   ├── index.ts               # Add ValidationResultsDisplay export
│   ├── onix-export-modal.tsx  # Update with validation display
│   └── validation-results.tsx # NEW

schemas/onix/                  # NEW - XSD reference files (NOT public)
├── ONIX_BookProduct_3.1_reference.xsd
└── README.md                  # Licensing notes
```

### Modal Integration

Update existing `ONIXExportModal` to include validation:

```typescript
// src/modules/onix/components/onix-export-modal.tsx - UPDATED PROPS
interface ONIXExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportResult: ExportResult | null;
  isLoading?: boolean;
  // NEW: Validation support
  validationResult?: ValidationResult;
  onRevalidate?: () => void;
  isValidating?: boolean;
}

// Add to component body, after export result display:
export function ONIXExportModal({
  open,
  onOpenChange,
  exportResult,
  isLoading = false,
  validationResult,
  onRevalidate,
  isValidating = false,
}: ONIXExportModalProps) {
  // ... existing state ...

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        {/* ... existing header ... */}

        {/* NEW: Validation status */}
        {validationResult && (
          <ValidationResultsDisplay
            result={validationResult}
            onRevalidate={onRevalidate}
            isLoading={isValidating}
          />
        )}

        {/* ... existing XML preview ... */}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {/* ... existing footer ... */}
          {/* Disable download if validation failed */}
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!exportResult || (validationResult && !validationResult.valid)}
          >
            <Download className="h-4 w-4 mr-1" />
            Download XML
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Dependencies

**Required (install first):**

```bash
pnpm add fast-xml-parser
```

fast-xml-parser provides:
- `XMLParser` - Parse XML to JavaScript object
- `XMLValidator` - Validate XML is well-formed
- Pure JavaScript - no native bindings, serverless-compatible

**Optional (local development only):**

```bash
# Only if you need full XSD validation locally
pnpm add libxmljs2
```

⚠️ libxmljs2 has native bindings - may not work on Fly.io/Vercel/serverless.

### Database Schema Update

No schema changes needed - existing `onix_exports.status` already supports "validation_error" and `error_message` field stores JSON errors.

### Previous Story Intelligence

From Story 14.1:
- ONIXMessageBuilder generates well-formed XML but doesn't validate
- Export actions store results in `onix_exports` table
- XML preview modal exists for viewing generated content
- All XML escaping handled by builder utilities

### Testing Requirements

```typescript
describe("Structural Validator", () => {
  it("validates well-formed ONIX 3.1 XML", async () => {
    const xml = buildValidONIXMessage();
    const result = await validateStructure(xml);
    expect(result.valid).toBe(true);
  });

  it("rejects malformed XML", async () => {
    const xml = "<ONIXMessage><Invalid></ONIXMessage>";
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe("schema");
  });

  it("rejects XML missing required Header", async () => {
    const xml = '<ONIXMessage><Product></Product></ONIXMessage>';
    const result = await validateStructure(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_HEADER" })
    );
  });

  it("rejects XML missing required Product elements", async () => {
    const xml = buildONIXWithEmptyProduct();
    const result = await validateStructure(xml);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_RECORDREFERENCE" })
    );
  });
});

describe("Business Rule Validator", () => {
  it("validates required fields", async () => {
    const xml = buildONIXWithMissingTitle();
    const result = await validateBusinessRules(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_TITLE" })
    );
  });

  it("validates ISBN-13 checksum", async () => {
    const xml = buildONIXWithInvalidISBN("9781234567899"); // Invalid checksum
    const result = await validateBusinessRules(xml);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_ISBN" })
    );
  });

  it("validates codelist values", async () => {
    const xml = buildONIXWithInvalidProductForm("ZZ");
    const result = await validateBusinessRules(xml);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_CODELIST",
        codelistRef: "List 150"
      })
    );
  });
});

describe("validateONIXExport action", () => {
  it("requires CREATE_AUTHORS_TITLES permission", async () => {
    // Mock unauthorized user
    const result = await validateONIXExport("<xml/>");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Permission denied");
  });

  it("returns validation result for valid XML", async () => {
    // Mock authorized user
    const xml = buildValidONIXMessage();
    const result = await validateONIXExport(xml);
    expect(result.success).toBe(true);
    expect(result.data?.valid).toBe(true);
  });
});
```

### Important Constraints

1. **Serverless-first:** Use fast-xml-parser (pure JS) - libxmljs2 has native bindings incompatible with Fly.io
2. **Two-layer validation:** Structural validation first, business rules second
3. **Blocking validation:** Invalid messages should not be marked as "success"
4. **Re-validation support:** User can fix data and re-validate without regenerating
5. **Error serialization:** Errors stored as JSON in database for audit
6. **Schema files private:** Store XSD in `schemas/` not `public/` to prevent web exposure

### Project Structure Notes

- Validator follows existing module pattern (actions.ts, types.ts, components/)
- Uses existing permission system (`requirePermission`)
- Integrates with existing export modal component
- No new database tables required

### References

- [Source: docs/architecture.md#Pattern 4: ONIX 3.1 Message Builder]
- [Source: docs/architecture.md#Two-Layer Validation]
- [Source: docs/epics.md#Story 14.2]
- [Source: src/modules/onix/actions.ts - existing export actions]
- [Source: src/modules/onix/builder/message-builder.ts - XML generation]
- [EDItEUR ONIX 3.1 Downloads](https://www.editeur.org/93/Release-3.1-Downloads/)

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Fixed fast-xml-parser parsing numbers instead of strings with `parseTagValue: false`

### Completion Notes List

- Two-layer validation implemented: structural (schema) then business rules
- All 126 ONIX tests passing
- Validation integrated into export actions with status tracking

### File List

**Created:**
- `src/modules/onix/validator/index.ts` - Main validator module with validateONIXMessage
- `src/modules/onix/validator/schema-validator.ts` - XML structural validation
- `src/modules/onix/validator/business-rules.ts` - EDItEUR codelist and business rule validation
- `src/modules/onix/components/validation-results.tsx` - ValidationResultsDisplay UI component
- `tests/unit/onix-schema-validator.test.ts` - 12 structural validator tests
- `tests/unit/onix-business-rules.test.ts` - 18 business rule tests
- `tests/unit/onix-validation-ui.test.tsx` - 15 UI component tests

**Modified:**
- `src/modules/onix/types.ts` - Added ValidationError, ValidationResult, ExportResultWithValidation
- `src/modules/onix/actions.ts` - Added validateONIXExport action, updated export actions with validation
- `src/modules/onix/components/onix-export-modal.tsx` - Added validation display and re-validate support
- `src/modules/onix/components/index.ts` - Added ValidationResultsDisplay export
- `src/modules/onix/index.ts` - Added validator and component exports
- `tests/unit/onix-actions.test.ts` - Added validation tests
