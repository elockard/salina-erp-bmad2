# Story 14.3: Add Accessibility Metadata Support (Codelist 196)

Status: done

## Story

As a **publisher**,
I want **to include accessibility metadata in ONIX exports**,
so that **I comply with European Accessibility Act requirements**.

## Acceptance Criteria

1. **AC1:** Given I have an existing title, when I configure accessibility features in title-detail view, then I can specify EPUB accessibility conformance level (which includes WCAG level)
2. **AC2:** Given I am configuring accessibility, when I select conformance level, then I can choose from EPUB Accessibility 1.0/1.1 with WCAG 2.0/2.1/2.2 at levels A, AA, or AAA
3. **AC3:** Given I am configuring accessibility features, when I view the options, then I can indicate:
   - All textual content modifiable
   - Index navigation available
   - No accessibility options disabled
   - Additional Codelist 196 features (grouped by category)
4. **AC4:** Given I export a title with accessibility metadata, when ONIX XML is generated, then ProductFormFeature elements include Codelist 196 values
5. **AC5:** Given I view the titles list, when accessibility metadata exists (minimum: conformance level set), then system displays accessibility status indicator
6. **AC6:** Given I have titles without minimum accessibility metadata (no conformance level), when I view them, then system displays EAA compliance warning

## Tasks / Subtasks

- [x] Task 1: Extend titles schema with accessibility fields (AC: 1, 2, 3)
  - [x] 1.1 Add `accessibility_summary` text field for free-form description
  - [x] 1.2 Add `epub_accessibility_conformance` text field (Codelist 196 values: 00-11, encodes EPUB+WCAG level)
  - [x] 1.3 Add `accessibility_features` text array for Codelist 196 feature codes (10-26)
  - [x] 1.4 Add `accessibility_hazards` text array for hazard codes (00-07)
  - [x] 1.5 Generate and run migration
  - [x] 1.6 Write schema tests

- [x] Task 2: Extend Zod validation schema (AC: 1, 2, 3)
  - [x] 2.1 Add accessibility fields to `src/modules/titles/schema.ts`
  - [x] 2.2 Add enum validation for `epub_accessibility_conformance` (00-11)
  - [x] 2.3 Add array validation for `accessibility_features` (valid codes only)
  - [x] 2.4 Add mutual exclusivity validation for hazards (cannot have both "02" and "05", etc.)
  - [x] 2.5 Write schema validation tests

- [x] Task 3: Create accessibility builder module for ONIX (AC: 4)
  - [x] 3.1 Create `src/modules/onix/builder/accessibility.ts`
  - [x] 3.2 Implement `buildAccessibilityFeatures()` function
  - [x] 3.3 Map database fields to ProductFormFeature XML elements
  - [x] 3.4 Integrate into message-builder.ts DescriptiveDetail block
  - [x] 3.5 Write unit tests for accessibility XML generation

- [x] Task 4: Add accessibility validator rules (AC: 4)
  - [x] 4.1 Add Codelist 196 validation to business-rules.ts
  - [x] 4.2 Validate conformance value in range 00-11
  - [x] 4.3 Validate feature codes in range 10-26
  - [x] 4.4 Validate hazard mutual exclusivity in ONIX output
  - [x] 4.5 Write validation tests

- [x] Task 5: Build accessibility configuration UI (AC: 1, 2, 3)
  - [x] 5.1 Create `AccessibilityForm` component following title-form.tsx patterns
  - [x] 5.2 Add conformance level Select dropdown (maps code to human-readable label)
  - [x] 5.3 Add feature checkboxes grouped by category (text, navigation, media)
  - [x] 5.4 Add hazard checkboxes with mutual exclusivity enforcement
  - [x] 5.5 Integrate into `title-detail.tsx` as collapsible section
  - [ ] 5.6 Write component tests (deferred)

- [x] Task 6: Add accessibility status tracking (AC: 5, 6)
  - [x] 6.1 Create `hasMinimumAccessibilityMetadata()` utility (checks conformance level set)
  - [x] 6.2 Add accessibility badge to titles list (green=complete, yellow=partial, none=missing)
  - [x] 6.3 Add EAA compliance warning banner in title-detail for missing metadata
  - [x] 6.4 Add filter option: "Needs accessibility metadata"
  - [ ] 6.5 Write integration tests (deferred)

- [x] Task 7: Server actions for accessibility (AC: 1-4)
  - [x] 7.1 Create `updateTitleAccessibility` action with `CREATE_AUTHORS_TITLES` permission
  - [x] 7.2 Extend `getTitleWithAuthors` to include accessibility fields
  - [x] 7.3 Add accessibility to ONIX export pipeline
  - [ ] 7.4 Write action tests (deferred)

## Dev Notes

### Codelist 196 Reference

ONIX Codelist 196 uses ProductFormFeatureType `09` for accessibility conformance/features and `12` for hazards.

**EPUB Accessibility Conformance (Type 09, Values 00-11):**

| Code | Description |
|------|-------------|
| 00 | No accessibility information |
| 01 | LIA Compliance Scheme |
| 02 | EPUB Accessibility 1.0 compliant |
| 03 | EPUB Accessibility 1.0 + WCAG 2.0 Level A |
| 04 | EPUB Accessibility 1.0 + WCAG 2.0 Level AA |
| 05 | EPUB Accessibility 1.0 + WCAG 2.0 Level AAA |
| 06 | EPUB Accessibility 1.1 + WCAG 2.1 Level A |
| 07 | EPUB Accessibility 1.1 + WCAG 2.1 Level AA |
| 08 | EPUB Accessibility 1.1 + WCAG 2.1 Level AAA |
| 09 | EPUB Accessibility 1.1 + WCAG 2.2 Level A |
| 10 | EPUB Accessibility 1.1 + WCAG 2.2 Level AA |
| 11 | EPUB Accessibility 1.1 + WCAG 2.2 Level AAA |

**Accessibility Features (Type 09, Values 10-26):**

| Code | Description | Category |
|------|-------------|----------|
| 10 | All textual content can be modified | Text |
| 11 | Language tagging provided | Text |
| 12 | No reading system accessibility options disabled | Text |
| 13 | Table of contents navigation | Navigation |
| 14 | Index navigation | Navigation |
| 15 | Reading order provided | Navigation |
| 16 | Short alternative descriptions | Media |
| 17 | Full alternative descriptions | Media |
| 18 | Visualized data also available as text | Media |
| 19 | ARIA roles provided | Technical |
| 20 | Accessible math content (MathML) | Technical |
| 21 | Accessible chemistry content (ChemML) | Technical |
| 22 | Print-equivalent page numbering | Navigation |
| 24 | Synchronised pre-recorded audio | Media |
| 25 | Text-to-speech hinting provided | Media |
| 26 | No hazards | Hazards |

**Accessibility Hazards (Type 12, Values 00-07):**

| Code | Description | Mutually Exclusive With |
|------|-------------|------------------------|
| 00 | Unknown | All others |
| 01 | No hazards | 02, 03, 04 |
| 02 | Flashing hazard | 01, 05 |
| 03 | Motion simulation hazard | 01, 06 |
| 04 | Sound hazard | 01, 07 |
| 05 | No flashing hazard | 02 |
| 06 | No motion simulation hazard | 03 |
| 07 | No sound hazard | 04 |

### ONIX XML Output Structure

```xml
<DescriptiveDetail>
  <!-- Existing elements (ProductComposition, ProductForm, TitleDetail, Contributors)... -->

  <!-- Conformance level (Type 09, one of codes 00-11) -->
  <ProductFormFeature>
    <ProductFormFeatureType>09</ProductFormFeatureType>
    <ProductFormFeatureValue>07</ProductFormFeatureValue>
    <ProductFormFeatureDescription>EPUB Accessibility 1.1 compliant with WCAG 2.1 Level AA</ProductFormFeatureDescription>
  </ProductFormFeature>

  <!-- Features (Type 09, codes 10-26, one element per feature) -->
  <ProductFormFeature>
    <ProductFormFeatureType>09</ProductFormFeatureType>
    <ProductFormFeatureValue>10</ProductFormFeatureValue>
  </ProductFormFeature>
  <ProductFormFeature>
    <ProductFormFeatureType>09</ProductFormFeatureType>
    <ProductFormFeatureValue>14</ProductFormFeatureValue>
  </ProductFormFeature>

  <!-- Hazards (Type 12, codes 00-07) -->
  <ProductFormFeature>
    <ProductFormFeatureType>12</ProductFormFeatureType>
    <ProductFormFeatureValue>05</ProductFormFeatureValue>
  </ProductFormFeature>
  <ProductFormFeature>
    <ProductFormFeatureType>12</ProductFormFeatureType>
    <ProductFormFeatureValue>06</ProductFormFeatureValue>
  </ProductFormFeature>
</DescriptiveDetail>
```

### Database Schema Extension

```typescript
// In src/db/schema/titles.ts - ADD these fields:

/** EPUB accessibility conformance level (Codelist 196 Type 09: 00-11) */
epub_accessibility_conformance: text("epub_accessibility_conformance"),

/** Accessibility features array (Codelist 196 Type 09: 10-26) */
accessibility_features: text("accessibility_features").array(),

/** Accessibility hazards array (Codelist 196 Type 12: 00-07) */
accessibility_hazards: text("accessibility_hazards").array(),

/** Free-form accessibility summary for ProductFormFeatureDescription */
accessibility_summary: text("accessibility_summary"),
```

### Zod Schema Extension

```typescript
// In src/modules/titles/schema.ts - ADD:

const VALID_CONFORMANCE = ["00","01","02","03","04","05","06","07","08","09","10","11"] as const;
const VALID_FEATURES = ["10","11","12","13","14","15","16","17","18","19","20","21","22","24","25","26"] as const;
const VALID_HAZARDS = ["00","01","02","03","04","05","06","07"] as const;

// Mutual exclusivity pairs for hazards
const HAZARD_CONFLICTS: Record<string, string[]> = {
  "00": ["01","02","03","04","05","06","07"], // Unknown excludes all
  "01": ["02","03","04"],  // No hazards excludes specific hazards
  "02": ["01","05"],       // Flashing excludes no-hazards and no-flashing
  "03": ["01","06"],
  "04": ["01","07"],
  "05": ["02"],
  "06": ["03"],
  "07": ["04"],
};

export const accessibilitySchema = z.object({
  epub_accessibility_conformance: z.enum(VALID_CONFORMANCE).nullable(),
  accessibility_features: z.array(z.enum(VALID_FEATURES)).default([]),
  accessibility_hazards: z.array(z.enum(VALID_HAZARDS)).default([])
    .refine((hazards) => {
      for (const h of hazards) {
        const conflicts = HAZARD_CONFLICTS[h] || [];
        if (hazards.some(other => conflicts.includes(other))) return false;
      }
      return true;
    }, "Conflicting hazard selections"),
  accessibility_summary: z.string().nullable(),
});
```

### UI Integration Point

Accessibility is configured on **existing titles** via `title-detail.tsx`, not during creation:
- Add collapsible "Accessibility Metadata" section
- Follow existing FormField/Select/Checkbox patterns from `title-form.tsx`
- Use shadcn/ui components: `Collapsible`, `Select`, `Checkbox`, `Badge`

### Minimum Metadata for EAA Compliance

A title has "minimum accessibility metadata" when:
- `epub_accessibility_conformance` is set to any value OTHER than "00" (No information)

Titles with "00" or NULL conformance display EAA compliance warning.

### Permission Requirements

`updateTitleAccessibility` action requires `CREATE_AUTHORS_TITLES` permission (Owner, Admin, Editor roles) - consistent with other title modification actions.

### Project Structure

**New files:**
- `src/modules/onix/builder/accessibility.ts`
- `src/modules/titles/components/accessibility-form.tsx`
- `tests/unit/onix-accessibility.test.ts`

**Modified files:**
- `src/db/schema/titles.ts` - Add fields
- `src/modules/titles/schema.ts` - Add Zod validation
- `src/modules/onix/builder/message-builder.ts` - Integrate builder
- `src/modules/onix/validator/business-rules.ts` - Add validation
- `src/modules/onix/types.ts` - Add type definitions
- `src/modules/titles/components/title-detail.tsx` - Add UI section
- `src/modules/title-authors/queries.ts` - Include in queries

### References

- [Source: docs/epics.md#Story 14.3] - User story and acceptance criteria
- [Source: docs/architecture.md:21] - Codelist 196 accessibility support
- [Source: docs/prd.md#FR115] - EPUB Accessibility requirement
- [Source: src/modules/onix/builder/message-builder.ts] - Builder pattern
- [Source: src/modules/titles/components/title-form.tsx] - UI patterns (Zod, FormField, Select)
- [Source: src/modules/titles/schema.ts] - Zod schema to extend

### Previous Story Intelligence

**From Story 14.2 (ONIX Schema Validation):**
- Two-layer validation: structural first, then business rules
- Codelist validation uses `VALID_*` constant arrays
- Error messages include `codelistRef` for user guidance
- ValidationError includes path, expected, actual

**From Story 14.1 (ONIX Message Generator):**
- ONIXMessageBuilder class with method chaining
- buildProduct() → buildDescriptiveDetail() is the integration point
- escapeXML() utility for safe XML generation

### EAA Compliance Deadline

**Critical:** European Accessibility Act requires accessibility metadata by **June 2025**.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

### File List
