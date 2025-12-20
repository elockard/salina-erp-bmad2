# Story 19.2: Download CSV Templates

Status: done

## Story

As a **publisher**,
I want **CSV templates for data entry**,
So that **I can prepare data in correct format**.

## Acceptance Criteria

1. **Given** I'm on the title import page
   **When** I click "Download Template"
   **Then** I receive a CSV file with correct column headers

2. **And** headers match importable fields exactly

3. **And** template includes example row with valid sample data

4. **And** templates include data format notes (validation rules in a notes row)

## Tasks / Subtasks

- [x] **Task 1: Create CSV template generator utility** (AC: 1, 2, 3, 4)
  - [x] 1.1 Create `src/modules/import-export/templates/csv-template-generator.ts`
  - [x] 1.2 Implement `generateTitlesTemplate()` using `TITLE_FIELD_METADATA` from types.ts
  - [x] 1.3 Include UTF-8 BOM prefix (`\ufeff`) for Excel compatibility
  - [x] 1.4 Include header row, example data row, and validation rules (prefixed with #)

- [x] **Task 2: Create DownloadTemplateButton component** (AC: 1)
  - [x] 2.1 Create `src/modules/import-export/components/download-template-button.tsx`
  - [x] 2.2 Follow `ar-export-buttons.tsx` pattern for CSV download (Blob + createObjectURL)
  - [x] 2.3 Add loading state during download
  - [x] 2.4 Add `data-testid="download-template-button"` for E2E testing

- [x] **Task 3: Integrate into CsvImportPage component** (AC: 1)
  - [x] 3.1 Add DownloadTemplateButton to `csv-import-page.tsx` header section
  - [x] 3.2 Position next to "Start Import" button
  - [x] 3.3 Update component exports in `components/index.ts`
  - [x] 3.4 Update module exports in `index.ts`

- [x] **Task 4: Write tests** (AC: All)
  - [x] 4.1 Unit test for template generation - verify headers match TITLE_FIELD_METADATA
  - [x] 4.2 Unit test for example row - verify valid sample data
  - [x] 4.3 Unit test for format notes - verify each field's validation rules included
  - [x] 4.4 Unit test for UTF-8 BOM presence

## Dev Notes

### FRs Implemented
- **FR172**: Publisher can download CSV templates for bulk data entry

### Architecture Compliance

**Module Location:** `src/modules/import-export/` (existing Phase 3 module)

**CRITICAL - Reuse Existing Code (DO NOT REINVENT):**
| Component | Location | Reuse Strategy |
|-----------|----------|----------------|
| TITLE_FIELD_METADATA | `src/modules/import-export/types.ts:86-150` | **USE DIRECTLY** - Contains field labels, descriptions, examples, required flags |
| IMPORTABLE_TITLE_FIELDS | `src/modules/import-export/types.ts:58-68` | **USE DIRECTLY** - Defines importable field names |
| CSV Download Pattern | `src/modules/reports/components/ar-export-buttons.tsx:226-249` | **FOLLOW EXACTLY** - Blob creation, URL.createObjectURL, link click pattern |

**File Structure:**
```
src/modules/import-export/
├── templates/
│   └── csv-template-generator.ts   # NEW - Template generation logic
├── components/
│   ├── csv-import-page.tsx         # MODIFY - Add download button to header
│   ├── download-template-button.tsx # NEW - Download button component
│   └── index.ts                    # MODIFY - Export DownloadTemplateButton
├── index.ts                        # MODIFY - Export generateTitlesTemplate
└── types.ts                        # REUSE TITLE_FIELD_METADATA
```

### Technical Requirements

**Template Format:**
```csv
# Salina ERP Title Import Template
# Generated: 2024-01-15
# See validation rules at bottom of file
# Empty cells are allowed for optional fields. Do NOT use "N/A" or "null" - leave blank.
title,subtitle,author_name,isbn,genre,publication_date,publication_status,word_count,asin
The Great Gatsby,A Novel,F. Scott Fitzgerald,978-0-7432-7356-5,Fiction,2024-01-15,published,47094,B08N5WRWNW
# VALIDATION RULES:
# title: Required, max 500 characters
# subtitle: Optional, max 500 characters
# author_name: Must match existing contact with author role (case-insensitive)
# isbn: ISBN-13 format (13 digits, hyphens optional, checksum validated)
# genre: Optional, max 100 characters
# publication_date: YYYY-MM-DD format
# publication_status: draft | pending | published | out_of_print (defaults to draft)
# word_count: Positive integer
# asin: 10 alphanumeric characters (uppercase)
```

**Template Generator Implementation:**
```typescript
// src/modules/import-export/templates/csv-template-generator.ts
import { format } from "date-fns";
import { TITLE_FIELD_METADATA, IMPORTABLE_TITLE_FIELDS } from "../types";

/**
 * Generate CSV template for title imports
 * Includes UTF-8 BOM for Excel compatibility
 */
export function generateTitlesTemplate(): string {
  const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");

  // Header row from IMPORTABLE_TITLE_FIELDS
  const headers = IMPORTABLE_TITLE_FIELDS.join(",");

  // Example row from TITLE_FIELD_METADATA examples
  const examples = IMPORTABLE_TITLE_FIELDS.map(field => {
    const meta = TITLE_FIELD_METADATA.find(m => m.field === field);
    return meta?.example || "";
  });
  const exampleRow = examples.join(",");

  // Format notes from TITLE_FIELD_METADATA descriptions
  const formatNotes = TITLE_FIELD_METADATA.map(meta =>
    `# ${meta.field}: ${meta.required ? "Required" : "Optional"}. ${meta.description}`
  );

  const content = [
    `# Salina ERP Title Import Template`,
    `# Generated: ${timestamp}`,
    `# See validation rules at bottom of file`,
    `# Empty cells are allowed for optional fields. Do NOT use "N/A" or "null" - leave blank.`,
    ``,
    headers,
    exampleRow,
    ``,
    `# VALIDATION RULES:`,
    ...formatNotes,
  ].join("\n");

  // UTF-8 BOM for Excel compatibility
  return `\ufeff${content}`;
}
```

**Download Button Component:**
```typescript
// src/modules/import-export/components/download-template-button.tsx
"use client";

import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateTitlesTemplate } from "../templates/csv-template-generator";

export function DownloadTemplateButton() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const template = generateTitlesTemplate();
      const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `salina-title-import-template-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={isDownloading}
      data-testid="download-template-button"
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </>
      )}
    </Button>
  );
}
```

**Integration in CsvImportPage (modify existing):**
```typescript
// In src/modules/import-export/components/csv-import-page.tsx
// Add to header section (around line 53-65):

import { DownloadTemplateButton } from "./download-template-button";

// Inside the component, update header:
<div className="flex items-center gap-4">
  <Link href="/titles">
    <Button variant="ghost" size="icon">
      <ArrowLeft className="h-4 w-4" />
    </Button>
  </Link>
  <div className="flex-1">
    <h1 className="text-2xl font-bold">Import Titles from CSV</h1>
    <p className="text-muted-foreground">
      Upload a CSV file to bulk import titles into your catalog
    </p>
  </div>
  <DownloadTemplateButton />
</div>
```

### Security Requirements
- No permission check required (templates are static, non-sensitive)
- No tenant data exposed (static template only)
- Client-side generation only (no server round-trip)

### UI/UX Pattern

**Button Location:**
- Position: CsvImportPage header, right-aligned
- Style: Secondary/outline button with Download icon
- Label: "Download Template"

**Button States:**
1. Default: "Download Template" with Download icon
2. Loading: "Downloading..." with spinner (prevents double-clicks)

### Library/Framework Requirements

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| date-fns | ^4.1+ | Timestamp formatting | Installed |
| lucide-react | latest | Download/Loader2 icons | Installed |

No new dependencies required.

### Testing Requirements

**Unit Tests (`tests/unit/csv-template-generator.test.ts`):**
```typescript
import { generateTitlesTemplate } from "@/modules/import-export/templates/csv-template-generator";
import { IMPORTABLE_TITLE_FIELDS, TITLE_FIELD_METADATA } from "@/modules/import-export/types";

describe("CSV Template Generator", () => {
  describe("generateTitlesTemplate", () => {
    it("starts with UTF-8 BOM for Excel compatibility", () => {
      const template = generateTitlesTemplate();
      expect(template.charCodeAt(0)).toBe(0xFEFF);
    });

    it("includes all importable field headers", () => {
      const template = generateTitlesTemplate();
      const lines = template.split("\n");
      const headerLine = lines.find(l => !l.startsWith("#") && !l.startsWith("\ufeff") && l.trim());
      expect(headerLine).toBe(IMPORTABLE_TITLE_FIELDS.join(","));
    });

    it("includes example row with valid sample data", () => {
      const template = generateTitlesTemplate();
      expect(template).toContain("The Great Gatsby");
      expect(template).toContain("978-0-7432-7356-5");
      expect(template).toContain("B08N5WRWNW");
    });

    it("includes validation rules for each field", () => {
      const template = generateTitlesTemplate();
      IMPORTABLE_TITLE_FIELDS.forEach(field => {
        expect(template).toContain(`# ${field}:`);
      });
    });

    it("marks required fields correctly", () => {
      const template = generateTitlesTemplate();
      expect(template).toContain("# title: Required");
    });

    it("includes generation timestamp", () => {
      const template = generateTitlesTemplate();
      expect(template).toMatch(/# Generated: \d{4}-\d{2}-\d{2}/);
    });

    it("includes empty cell guidance", () => {
      const template = generateTitlesTemplate();
      expect(template).toContain("Empty cells are allowed for optional fields");
    });
  });
});
```

### References

- [Source: docs/epics.md#Story-19.2] - Story requirements and acceptance criteria
- [Source: docs/architecture.md#import-export] - Module location (lines 311-323)
- [Source: src/modules/import-export/types.ts:58-150] - **CRITICAL** TITLE_FIELD_METADATA and IMPORTABLE_TITLE_FIELDS
- [Source: src/modules/import-export/schema.ts:98-102] - Genre max 100 chars validation
- [Source: src/modules/reports/components/ar-export-buttons.tsx:226-249] - **FOLLOW** CSV download pattern
- [Source: src/modules/import-export/components/csv-import-page.tsx:53-65] - Integration target (header section)

### Previous Story Learnings

**From Story 19.1 (Import Catalog via CSV):**
- TITLE_FIELD_METADATA already has all field metadata needed for template generation
- Import validation expects headers to match IMPORTABLE_TITLE_FIELDS exactly
- Example values in TITLE_FIELD_METADATA are already valid test data
- Column mapping UI auto-maps common header variations via HEADER_AUTO_MAP
- Genre field max length is 100 chars (schema.ts:100-102)

**From ar-export-buttons.tsx (CSV Export Pattern):**
- Use Blob with `text/csv;charset=utf-8;` MIME type
- Use URL.createObjectURL for download link
- Clean up with URL.revokeObjectURL after download
- Add loading state to prevent double-clicks
- Timestamp in filename for uniqueness

**Key Implementation Notes:**
1. Template headers MUST match IMPORTABLE_TITLE_FIELDS exactly or import will fail
2. Example row should pass all validation rules defined in schema.ts
3. UTF-8 BOM (`\ufeff`) is required for Excel to properly display international characters
4. Client-side generation only - no server action needed for static content
5. Integrate into CsvImportPage.tsx, NOT page.tsx (page.tsx is server component)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- **Task 1**: Created `csv-template-generator.ts` with `generateTitlesTemplate()` function that:
  - Uses TITLE_FIELD_METADATA and IMPORTABLE_TITLE_FIELDS from types.ts
  - Generates headers matching importable fields exactly
  - Includes example row from field metadata
  - Includes validation rules as comment rows
  - Prefixes output with UTF-8 BOM for Excel compatibility

- **Task 2**: Created `DownloadTemplateButton` component following ar-export-buttons.tsx pattern:
  - Client-side blob generation and download
  - Loading state with spinner
  - Proper URL cleanup
  - data-testid for E2E testing

- **Task 3**: Integrated button into CsvImportPage header section right-aligned

- **Task 4**: Created 10 unit tests covering all acceptance criteria:
  - UTF-8 BOM presence
  - Header matching IMPORTABLE_TITLE_FIELDS
  - Example row with sample data
  - Validation rules for each field
  - Required/optional field marking
  - Timestamp inclusion

- **Code Review Fixes (2025-12-18)**:
  - M1: Added error handling with toast notification for download failures
  - M2: Removed unnecessary async keyword from handleDownload
  - M3: Added component test file for DownloadTemplateButton

### Senior Developer Review (AI)

**Review Date:** 2025-12-18
**Review Outcome:** Approve with Fixes Applied

**Findings Summary:**
- 0 Critical issues
- 0 High severity issues
- 3 Medium severity issues (all fixed)
- 2 Low severity issues (deferred)

**Action Items:**
- [x] M1: Add error handling to handleDownload - silent error swallowing fixed
- [x] M2: Remove unnecessary async keyword - code cleanup applied
- [x] M3: Add component test for DownloadTemplateButton - test file created

**Deferred (Low Priority):**
- L1: O(n²) lookup optimization - minimal impact with 9 fields
- L2: Round-trip integration test - nice to have for future

### File List

- [x] `src/modules/import-export/templates/csv-template-generator.ts` - NEW
- [x] `src/modules/import-export/components/download-template-button.tsx` - NEW (+ review fixes)
- [x] `src/modules/import-export/components/csv-import-page.tsx` - MODIFY (add button to header)
- [x] `src/modules/import-export/components/index.ts` - MODIFY (export DownloadTemplateButton)
- [x] `src/modules/import-export/index.ts` - MODIFY (export generateTitlesTemplate, DownloadTemplateButton)
- [x] `tests/unit/csv-template-generator.test.ts` - NEW
- [x] `tests/unit/download-template-button.test.tsx` - NEW (code review)
