# Story 19.5: BISAC Code Suggestions

Status: done

## Story

As a **publisher**,
I want **BISAC codes suggested during import**,
So that **I can categorize titles correctly**.

## Acceptance Criteria

1. **Given** I am importing titles via CSV
   **When** a title has a description or title text but no BISAC code mapped
   **Then** system suggests relevant BISAC codes based on keywords

2. **And** I can accept or override the suggestions

3. **And** suggestions are based on title name, subtitle, and genre (if provided)

4. **And** I can see the full BISAC code hierarchy with descriptions

5. **And** selected BISAC codes are stored with the title

## Tasks / Subtasks

- [x] **Task 1: Create BISAC codes data source** (AC: 3, 4)
  - [x] 1.1 Create `src/modules/import-export/data/bisac-codes.json` with full BISAC code hierarchy
  - [x] 1.2 Include top-level categories (FIC, NON, JUV, etc.) with subcategories
  - [x] 1.3 Include keywords for each category for matching
  - [x] 1.4 Include code, description, parent code, keywords array for each entry
  - [x] 1.5 Obtain BISAC codes from publicly available sources:
    - Primary: Parse BISG's free Complete BISAC Subject Headings PDF (bisg.org/complete-bisac-subject-headings-list)
    - Alternative: Use open-source BISAC datasets from GitHub (search "bisac codes json")
    - Note: Start with top 500 codes covering 90%+ of publishing use cases, expand as needed

- [x] **Task 2: Add BISAC fields to titles schema** (AC: 5)
  - [x] 2.1 Add `bisac_code` text field to `src/db/schema/titles.ts` (primary BISAC)
  - [x] 2.2 Add `bisac_codes` text array field for secondary BISAC codes (max 3 per industry standard)
  - [x] 2.3 Create migration `drizzle/migrations/0007_add_bisac_codes.sql`
  - [x] 2.4 Add partial index: `CREATE INDEX titles_bisac_code_idx ON titles (bisac_code) WHERE bisac_code IS NOT NULL`
  - [x] 2.5 Update `TitleWithAuthor` type in `src/modules/titles/types.ts` to include bisac_code, bisac_codes (auto-inferred from Title)

- [x] **Task 3: Create BISAC suggestion engine** (AC: 1, 3)
  - [x] 3.1 Create `src/modules/import-export/bisac/bisac-matcher.ts`
  - [x] 3.2 Implement `suggestBisacCodes(title: string, subtitle?: string, genre?: string): BisacSuggestion[]`
  - [x] 3.3 Use keyword matching with scoring algorithm (exact > partial > fuzzy)
  - [x] 3.4 Return top 5 suggestions with confidence scores
  - [x] 3.5 Handle edge cases: empty input, no matches, multiple equally-ranked matches

- [x] **Task 4: Create BISAC selector component** (AC: 2, 4)
  - [x] 4.1 Create `src/modules/import-export/components/bisac-selector.tsx`
  - [x] 4.2 Display suggested codes with descriptions and confidence scores
  - [x] 4.3 Add "Browse All" button to open full BISAC browser modal
  - [x] 4.4 Create `src/modules/import-export/components/bisac-browser-modal.tsx`
  - [x] 4.5 Implement searchable/filterable BISAC code tree view
  - [x] 4.6 Show hierarchical navigation (Fiction > Fiction / General > etc.)
  - [x] 4.7 Allow selecting up to 3 BISAC codes (primary + 2 secondary)

- [x] **Task 5: Integrate into import preview step** (AC: 1, 2)
  - [x] 5.1 Modify `src/modules/import-export/components/csv-validation-table.tsx`
  - [x] 5.2 Add BISAC suggestion column to preview table for rows without BISAC
  - [x] 5.3 Show suggestion badge with top match and "View More" option
  - [x] 5.4 Add inline edit capability to accept/change suggestion per row
  - [x] 5.5 Add batch action: "Apply Suggestions to All" with confirmation
  - [x] 5.6 Extend `csv-update-modal.tsx` with BISAC suggestion column (Story 19.4 bulk updates)

- [x] **Task 6: Extend import types and schema** (AC: 1, 5)
  - [x] 6.1 Add `bisac_code` to `IMPORTABLE_TITLE_FIELDS` in `types.ts`
  - [x] 6.2 Add BISAC to `TITLE_FIELD_METADATA` array with label, description, example
  - [x] 6.3 Add BISAC header auto-map variations: "bisac", "bisac code", "subject code"
  - [x] 6.4 Add `bisac_code` validation to `src/modules/import-export/schema.ts`:
    - Format: 3-letter prefix + 6-digit number (regex: `/^[A-Z]{3}\d{6}$/`)
    - Error: "BISAC code must be 3 letters + 6 digits (e.g., FIC000000)"
  - [x] 6.5 Update `ValidatedTitleRow.data` interface with `bisac_code?: string`

- [x] **Task 7: Update import action to save BISAC codes** (AC: 5)
  - [x] 7.1 Modify `importTitlesFromCsvAction()` in `actions.ts` to include bisac_code
  - [x] 7.2 Ensure BISAC suggestions are passed with import data
  - [x] 7.3 Store accepted BISAC codes with title records

- [x] **Task 8: Add BISAC to title form and detail view** (AC: 2, 4, 5)
  - [x] 8.1 Add BISAC selector to `src/modules/titles/components/title-form.tsx`
  - [x] 8.2 Add BISAC display/edit section to `src/modules/titles/components/title-detail.tsx`
  - [x] 8.3 Display current BISAC codes with descriptions in Card format
  - [x] 8.4 Allow inline editing with BISAC selector/browser
  - [x] 8.5 Allow adding/removing BISAC codes up to max of 3

- [x] **Task 9: Update CSV export to include BISAC** (AC: 5)
  - [x] 9.1 Add `bisac_code` to `EXPORTABLE_TITLE_FIELDS` in `types.ts`
  - [x] 9.2 Update CSV exporter to include BISAC codes column
  - [x] 9.3 Update CSV template generator for BISAC column

- [x] **Task 10: Integrate BISAC with ONIX export** (AC: 5)
  - [x] 10.1 Modify ONIX builder to include Subject element with SubjectSchemeIdentifier=10 (BISAC)
  - [x] 10.2 Map `bisac_code` to `<Subject><SubjectSchemeIdentifier>10</SubjectSchemeIdentifier><SubjectCode>{code}</SubjectCode></Subject>`
  - [x] 10.3 Support multiple BISAC codes in ONIX output (primary + secondary)
  - [x] 10.4 Add unit test verifying BISAC in generated ONIX XML

- [x] **Task 11: Write tests** (AC: All)
  - [x] 11.1 Unit test BISAC matching algorithm - keyword scoring
  - [x] 11.2 Unit test edge cases - empty input, multiple matches
  - [x] 11.3 Unit test BISAC selector component
  - [x] 11.4 Integration test import flow with BISAC suggestions
  - [x] 11.5 Integration test title form BISAC editing

## Dev Notes

### FRs Implemented
- **FR175**: System suggests BISAC codes based on title descriptions during import

### Architecture Compliance

**Module Location:** `src/modules/import-export/` (Phase 3 module per architecture.md)

**CRITICAL - Reusable Components (DO NOT REINVENT):**
| Component | Location | Reuse Strategy |
|-----------|----------|----------------|
| CsvImportModal | `src/modules/import-export/components/csv-import-modal.tsx` | **EXTEND** preview step |
| CsvUpdateModal | `src/modules/import-export/components/csv-update-modal.tsx` | **EXTEND** with BISAC suggestions |
| CsvValidationTable | `src/modules/import-export/components/csv-validation-table.tsx` | **EXTEND** with BISAC column |
| ColumnMapper | `src/modules/import-export/components/column-mapper.tsx` | **REUSE** - add BISAC field |
| Import Types | `src/modules/import-export/types.ts` | **EXTEND** with BISAC types |
| CodelistSelector | `src/modules/onix/components/codelist-selector.tsx` | **REFERENCE** for dropdown pattern |
| Title Form | `src/modules/titles/components/title-form.tsx` | **EXTEND** with BISAC selector |
| Title Detail | `src/modules/titles/components/title-detail.tsx` | **EXTEND** with BISAC display/edit |
| ONIX Builder | `src/modules/onix/builder/product-builder.ts` | **EXTEND** with Subject element |

**File Structure:**
```
src/modules/import-export/
├── data/
│   └── bisac-codes.json              # NEW - BISAC codes database
├── bisac/
│   ├── bisac-matcher.ts              # NEW - Keyword matching algorithm
│   ├── bisac-types.ts                # NEW - BISAC type definitions
│   └── index.ts                      # NEW - Module exports
├── components/
│   ├── bisac-selector.tsx            # NEW - BISAC code picker
│   ├── bisac-browser-modal.tsx       # NEW - Full BISAC browser
│   ├── csv-validation-table.tsx      # MODIFY - Add BISAC column
│   ├── csv-import-modal.tsx          # MODIFY - Pass BISAC to import
│   ├── csv-update-modal.tsx          # MODIFY - Add BISAC suggestions
│   └── index.ts                      # MODIFY - Export new components
├── types.ts                          # MODIFY - Add BISAC types + TITLE_FIELD_METADATA
└── schema.ts                         # MODIFY - Add BISAC validation with regex

src/db/schema/
└── titles.ts                         # MODIFY - Add bisac_code, bisac_codes + index

src/modules/titles/
├── types.ts                          # MODIFY - Add bisac_code to TitleWithAuthor
└── components/
    ├── title-form.tsx                # MODIFY - Add BISAC selector
    └── title-detail.tsx              # MODIFY - Add BISAC display/edit

src/modules/onix/builder/
└── product-builder.ts                # MODIFY - Add Subject element for BISAC

drizzle/migrations/
└── XXXX_add_bisac_codes.sql          # NEW - Migration with partial index
```

### Technical Requirements

**BISAC Code Data Structure:**
```typescript
// src/modules/import-export/bisac/bisac-types.ts

/**
 * BISAC code entry in the reference data
 */
export interface BisacCode {
  /** BISAC code (e.g., "FIC000000") */
  code: string;
  /** Display description (e.g., "FICTION / General") */
  description: string;
  /** Parent code for hierarchy (e.g., "FIC" for Fiction subcategories) */
  parentCode: string | null;
  /** Keywords for matching */
  keywords: string[];
  /** Category prefix (e.g., "FIC", "NON", "JUV") */
  category: string;
  /** Depth in hierarchy (0=root, 1=category, 2=subcategory, etc.) */
  depth: number;
}

/**
 * BISAC suggestion result
 */
export interface BisacSuggestion {
  /** The suggested BISAC code */
  code: string;
  /** Full description */
  description: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Keywords that matched */
  matchedKeywords: string[];
  /** Match type */
  matchType: "exact" | "partial" | "fuzzy";
}
```

**BISAC Matching Algorithm:**
```typescript
// src/modules/import-export/bisac/bisac-matcher.ts

import bisacCodes from "../data/bisac-codes.json";

/**
 * Suggest BISAC codes based on title metadata
 *
 * @param title - Title of the work
 * @param subtitle - Optional subtitle
 * @param genre - Optional genre/category hint
 * @returns Top 5 BISAC suggestions sorted by confidence
 */
export function suggestBisacCodes(
  title: string,
  subtitle?: string,
  genre?: string,
): BisacSuggestion[] {
  const text = [title, subtitle, genre].filter(Boolean).join(" ").toLowerCase();
  const words = text.split(/\s+/).filter(w => w.length >= 3);

  const suggestions: Map<string, BisacSuggestion> = new Map();

  for (const bisac of bisacCodes) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of bisac.keywords) {
      const keywordLower = keyword.toLowerCase();

      // Exact word match
      if (words.includes(keywordLower)) {
        score += 30;
        matchedKeywords.push(keyword);
      }
      // Partial match (keyword in text)
      else if (text.includes(keywordLower)) {
        score += 20;
        matchedKeywords.push(keyword);
      }
      // Fuzzy match (word starts with keyword or vice versa)
      else if (words.some(w => w.startsWith(keywordLower.slice(0, 4)))) {
        score += 10;
        matchedKeywords.push(keyword);
      }
    }

    // Boost for genre match
    if (genre && bisac.description.toLowerCase().includes(genre.toLowerCase())) {
      score += 25;
    }

    if (score > 0) {
      // Normalize score to 0-100
      const confidence = Math.min(100, Math.round(score / 3));

      suggestions.set(bisac.code, {
        code: bisac.code,
        description: bisac.description,
        confidence,
        matchedKeywords,
        matchType: score >= 30 ? "exact" : score >= 20 ? "partial" : "fuzzy",
      });
    }
  }

  // Sort by confidence descending, return top 5
  return Array.from(suggestions.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}
```

**Schema Update:**
```typescript
// Add to src/db/schema/titles.ts
bisac_code: text("bisac_code"),           // Primary BISAC (e.g., "FIC000000")
bisac_codes: text("bisac_codes").array(), // Secondary BISAC codes (max 3 total)

// Add to table indexes
bisacCodeIdx: index("titles_bisac_code_idx").on(table.bisac_code),
```

**ONIX Export Integration:**
```typescript
// Add to src/modules/onix/builder/product-builder.ts
// BISAC codes map to ONIX Subject element with SubjectSchemeIdentifier=10

private buildSubject(title: TitleWithAuthor): string {
  if (!title.bisac_code) return "";

  const subjects = [title.bisac_code, ...(title.bisac_codes || [])].filter(Boolean);
  return subjects.map(code => `
    <Subject>
      <SubjectSchemeIdentifier>10</SubjectSchemeIdentifier>
      <SubjectCode>${code}</SubjectCode>
    </Subject>
  `).join("");
}
```

**Import Types Extension:**
```typescript
// Add to src/modules/import-export/types.ts

// Add "bisac_code" to IMPORTABLE_TITLE_FIELDS array
export const IMPORTABLE_TITLE_FIELDS = [..., "bisac_code"] as const;

// Add to TITLE_FIELD_METADATA array
{ field: "bisac_code", label: "BISAC Code", required: false,
  description: "BISAC subject code (e.g., FIC000000)", example: "FIC009000" },

// Add to HEADER_AUTO_MAP
bisac: "bisac_code", "bisac code": "bisac_code", "subject code": "bisac_code",

// Add to ValidatedTitleRow.data interface
bisac_code?: string;
bisac_suggestions?: BisacSuggestion[];  // Auto-generated suggestions
```

**BISAC Validation Schema:**
```typescript
// Add to src/modules/import-export/schema.ts
const bisacCodeSchema = z.string()
  .regex(/^[A-Z]{3}\d{6}$/, "BISAC code must be 3 letters + 6 digits (e.g., FIC000000)")
  .optional();
```

**BISAC Selector Component Pattern:**
```typescript
// src/modules/import-export/components/bisac-selector.tsx

interface BisacSelectorProps {
  value: string | null;
  suggestions?: BisacSuggestion[];
  onChange: (code: string | null) => void;
  onBrowse?: () => void;
}

export function BisacSelector({
  value,
  suggestions = [],
  onChange,
  onBrowse,
}: BisacSelectorProps) {
  return (
    <div className="space-y-2">
      {/* Current selection */}
      {value && (
        <Badge variant="secondary" className="flex items-center gap-1">
          {value}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={() => onChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {/* Suggestions */}
      {!value && suggestions.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Suggestions</Label>
          {suggestions.slice(0, 3).map((suggestion) => (
            <Button
              key={suggestion.code}
              variant="outline"
              size="sm"
              className="w-full justify-start text-left"
              onClick={() => onChange(suggestion.code)}
            >
              <span className="font-mono mr-2">{suggestion.code}</span>
              <span className="truncate">{suggestion.description}</span>
              <Badge variant="secondary" className="ml-auto">
                {suggestion.confidence}%
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Browse button */}
      <Button variant="outline" size="sm" onClick={onBrowse}>
        <Search className="h-4 w-4 mr-2" />
        Browse All BISAC Codes
      </Button>
    </div>
  );
}
```

### Security Requirements

- **Permission**: Same as title operations (CREATE_AUTHORS_TITLES for import, VIEW for suggestions)
- **No External API Calls**: BISAC matching is fully client-side/server-side with static data
- **Static Data Only**: BISAC codes are shipped as static JSON, no dynamic fetching
- **Tenant Isolation**: BISAC codes are global reference data, not tenant-specific

### UI/UX Pattern

**Import Preview with BISAC Suggestions:**
```
┌────────────────────────────────────────────────────────────────┐
│ CSV Import Preview                                              │
├────────────────────────────────────────────────────────────────┤
│ Row  │ Title           │ Author     │ BISAC               │ ✓ │
├──────┼─────────────────┼────────────┼─────────────────────┼───┤
│ 1    │ The Lost Garden │ J. Smith   │ 💡 FIC066000 (89%)  │ ✓ │
│      │                 │            │   FICTION / Small   │   │
│      │                 │            │   Town & Rural      │   │
│      │                 │            │   [Accept] [Change] │   │
├──────┼─────────────────┼────────────┼─────────────────────┼───┤
│ 2    │ Python Basics   │ M. Jones   │ 💡 COM051360 (95%)  │ ✓ │
│      │                 │            │   COMPUTERS /       │   │
│      │                 │            │   Programming / Py  │   │
│      │                 │            │   [Accept] [Change] │   │
├──────┼─────────────────┼────────────┼─────────────────────┼───┤
│ 3    │ My Memoir       │ A. Brown   │ ⚠ No suggestion     │ ✓ │
│      │                 │            │   [Browse BISAC]    │   │
└──────┴─────────────────┴────────────┴─────────────────────┴───┘

                        [Apply Suggestions to All (2 rows)]
```

**BISAC Browser Modal:**
```
┌────────────────────────────────────────────────────────────────┐
│ Browse BISAC Subject Codes                              [X]    │
├────────────────────────────────────────────────────────────────┤
│ Search: [fantasy                    ] [🔍]                     │
├────────────────────────────────────────────────────────────────┤
│ ▼ FICTION (FIC)                                                │
│   ├─ FIC000000 - General                                       │
│   ├─ FIC009000 - Fantasy / General            ⭐              │
│   │  ├─ FIC009010 - Fantasy / Contemporary                    │
│   │  ├─ FIC009020 - Fantasy / Dark Fantasy                    │
│   │  ├─ FIC009030 - Fantasy / Epic            ⭐              │
│   │  └─ FIC009040 - Fantasy / Historical                      │
│   ├─ FIC028000 - Science Fiction / General                    │
│   └─ ...                                                       │
│                                                                │
│ ▶ JUVENILE FICTION (JUV)                                       │
│ ▶ YOUNG ADULT FICTION (YAF)                                    │
│ ▶ NON-FICTION (...)                                            │
├────────────────────────────────────────────────────────────────┤
│ Selected: FIC009030 - FICTION / Fantasy / Epic                │
│           [Clear]                                              │
└────────────────────────────────────────────────────────────────┘
                               [Cancel]  [Select Code]
```

### Project Structure Notes

**BISAC Codes Source:**
- Source from BISG 2024 Complete BISAC Subject Headings List
- Approximately 5,000+ unique codes
- Organized into major categories: FIC, NON, JUV, YAF, BIO, etc.
- Each code is 9 characters: 3-letter prefix + 6-digit number

**Static Data Bundle:**
- Ship as JSON file in build (~500KB estimated)
- Client-side filtering and searching
- No API calls for BISAC lookups

### Library/Framework Requirements

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Fuse.js | ^7.0 | Fuzzy text matching for BISAC search | NEW - Install |

Note: Consider using simple keyword matching first without Fuse.js to keep bundle size small. Fuse.js is optional enhancement for fuzzy browser search.

### Testing Requirements

**Unit Tests (`tests/unit/bisac-matcher.test.ts`):**
```typescript
describe("BISAC Matcher", () => {
  it("suggests Fiction/General for generic fiction title", () => {
    const suggestions = suggestBisacCodes("A Story of Love", undefined, "Fiction");
    expect(suggestions[0].code).toMatch(/^FIC/);
    expect(suggestions[0].confidence).toBeGreaterThan(50);
  });

  it("suggests Science Fiction for sci-fi keywords", () => {
    const suggestions = suggestBisacCodes("Star Commander: A Space Adventure");
    expect(suggestions.some(s => s.code.includes("028"))).toBe(true);
  });

  it("handles empty input gracefully", () => {
    const suggestions = suggestBisacCodes("");
    expect(suggestions).toEqual([]);
  });

  it("boosts confidence when genre matches description", () => {
    const withGenre = suggestBisacCodes("Adventure Story", undefined, "Fantasy");
    const withoutGenre = suggestBisacCodes("Adventure Story");
    expect(withGenre[0].confidence).toBeGreaterThan(withoutGenre[0].confidence);
  });

  it("returns top 5 suggestions sorted by confidence", () => {
    const suggestions = suggestBisacCodes("Mystery in the Old House", undefined, "Fiction");
    expect(suggestions.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
    }
  });
});
```

**Unit Tests (`tests/unit/bisac-selector.test.tsx`):**
```typescript
describe("BisacSelector", () => {
  it("renders suggestions with confidence scores");
  it("calls onChange when suggestion clicked");
  it("shows browse button for manual selection");
  it("displays current value with clear button");
});
```

**ONIX Export Test (`tests/unit/onix-bisac-export.test.ts`):**
```typescript
describe("ONIX BISAC Export", () => {
  it("includes Subject element with SubjectSchemeIdentifier=10", () => {
    const title = { bisac_code: "FIC009000", bisac_codes: ["FIC009030"] };
    const xml = buildProduct(title);
    expect(xml).toContain("<SubjectSchemeIdentifier>10</SubjectSchemeIdentifier>");
    expect(xml).toContain("<SubjectCode>FIC009000</SubjectCode>");
    expect(xml).toContain("<SubjectCode>FIC009030</SubjectCode>");
  });

  it("omits Subject element when no BISAC code");
});
```

### References

- [Source: docs/epics.md#Story-19.5] - Story requirements and acceptance criteria
- [Source: docs/prd.md#Journey-5] - "The system suggests BISAC codes based on descriptions"
- [Source: src/modules/import-export/components/csv-import-modal.tsx] - **EXTEND** import modal
- [Source: src/modules/import-export/components/csv-update-modal.tsx] - **EXTEND** bulk update modal
- [Source: src/modules/import-export/types.ts] - **EXTEND** with BISAC types
- [Source: src/modules/onix/codelists/data/codelist-27.json] - Subject Scheme Identifier (BISAC = code 10)
- [Source: src/modules/onix/builder/product-builder.ts] - **EXTEND** for ONIX Subject element
- [Source: src/modules/titles/components/title-detail.tsx] - **EXTEND** for BISAC display/edit
- [Source: src/db/schema/titles.ts] - Title schema to extend with BISAC fields
- [BISG BISAC Subject Headings](https://www.bisg.org/complete-bisac-subject-headings-list) - Official BISAC codes source (free PDF)

### Previous Story Learnings

**From Story 19.1 (Import Catalog via CSV):**
- CsvValidationTable renders preview with expandable rows - perfect for BISAC suggestions
- Column auto-mapping works well - extend with BISAC header variations
- Import modal has clear step progression - BISAC fits in preview step

**From Story 19.4 (Bulk Update via CSV):**
- Diff preview pattern shows inline editing capability
- Badge-based status indicators work well for suggestions
- Selective actions pattern applies to "Apply Suggestions to All"

**From Story 14.4 (Codelist Management):**
- CodelistSelector pattern provides good dropdown reference
- JSON data files for codelists work well at runtime
- Searchable/filterable list is essential for large code sets

**Key Implementation Notes:**
1. **Static BISAC Data** - Ship as JSON, no API calls needed
2. **Keyword Matching First** - Start simple, enhance with fuzzy later
3. **Confidence Scoring** - Display percentage to help users evaluate suggestions
4. **Max 3 BISAC Codes** - Industry standard, enforce in UI
5. **Primary BISAC First** - Mark first/main BISAC as primary
6. **Genre Boost** - If genre already mapped, use it to boost BISAC matching
7. **Inline Accept** - Make it one-click to accept suggestion in preview table
8. **Batch Apply** - "Apply All Suggestions" saves time for large imports
9. **Browse Fallback** - Always allow manual browse for edge cases
10. **Existing Data** - For bulk updates (19.4), show current BISAC vs suggested

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Initial implementation completed with all core functionality
- Code review identified gaps in: bisac-browser-modal.tsx, csv-validation-table.tsx BISAC column, title-form.tsx integration, tests
- Fixes applied: Created bisac-browser-modal.tsx, added BISAC column to CSV validation table, integrated BisacSelector into title-form.tsx
- Added missing tests: bisac-selector.test.tsx, csv-bisac-validation.test.ts
- Improved BISAC search with prioritized scoring (exact code match > prefix > description > keyword)
- Note: ONIX integration uses message-builder.ts not product-builder.ts (story reference outdated)

### File List

- [x] `src/modules/import-export/data/bisac-codes.json` - NEW
- [x] `src/modules/import-export/bisac/bisac-types.ts` - NEW
- [x] `src/modules/import-export/bisac/bisac-matcher.ts` - NEW
- [x] `src/modules/import-export/bisac/index.ts` - NEW
- [x] `src/modules/import-export/components/bisac-selector.tsx` - NEW
- [x] `src/modules/import-export/components/bisac-browser-modal.tsx` - NEW
- [x] `src/modules/import-export/components/csv-validation-table.tsx` - MODIFY (add BISAC column)
- [x] `src/modules/import-export/components/csv-import-modal.tsx` - MODIFY (pass BISAC to import)
- [x] `src/modules/import-export/components/csv-update-modal.tsx` - MODIFY (add BISAC suggestions for bulk updates)
- [x] `src/modules/import-export/components/index.ts` - MODIFY (export new components)
- [x] `src/modules/import-export/types.ts` - MODIFY (add BISAC types, field, and TITLE_FIELD_METADATA)
- [x] `src/modules/import-export/schema.ts` - MODIFY (add BISAC validation with regex)
- [x] `src/db/schema/titles.ts` - MODIFY (add bisac_code, bisac_codes with index)
- [x] `src/modules/titles/types.ts` - MODIFY (add bisac_code, bisac_codes to TitleWithAuthor)
- [x] `src/modules/titles/schema.ts` - MODIFY (add BISAC validation schemas)
- [x] `src/modules/titles/components/title-form.tsx` - MODIFY (add BISAC selector)
- [x] `src/modules/titles/components/title-detail.tsx` - MODIFY (add BISAC display/edit section)
- [x] `src/modules/onix/message-builder.ts` - MODIFY (add Subject element for BISAC)
- [x] `drizzle/0012_add_bisac_codes.sql` - NEW (includes partial index)
- [x] `tests/unit/bisac-matcher.test.ts` - NEW
- [x] `tests/unit/bisac-selector.test.tsx` - NEW
- [x] `tests/unit/csv-bisac-validation.test.ts` - NEW
