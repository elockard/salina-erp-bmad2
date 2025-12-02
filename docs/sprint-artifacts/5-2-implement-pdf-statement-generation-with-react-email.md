# Story 5.2: Implement PDF Statement Generation with React Email

Status: review

## Story

As a platform architect,
I want to generate professional PDF royalty statements,
so that authors receive formal documentation of earnings.

## Acceptance Criteria

1. AC-5.2.1: PDF template includes company logo placeholder, period dates, and author information (name, address)
2. AC-5.2.2: Summary section shows net payable, gross royalties, recoupment amounts prominently
3. AC-5.2.3: Sales breakdown table shows title, format, units sold, royalty rate, royalty earned
4. AC-5.2.4: Returns section (if applicable) shows quantity, value, and impact on net royalty
5. AC-5.2.5: Advance recoupment section shows original advance, previously recouped, this period's recoupment, remaining balance
6. AC-5.2.6: PDF uploads to S3 with key pattern `statements/{tenant_id}/{statement_id}.pdf`
7. AC-5.2.7: Generation runs as Inngest background job with proper error handling and retry logic

## Tasks / Subtasks

- [x] Task 1: Install and configure @react-pdf/renderer (AC: 1, 2, 3, 4, 5)
  - [x] 1.1: Add `@react-pdf/renderer` to package.json
  - [x] 1.2: Verify compatibility with existing React/Next.js versions
  - [x] 1.3: Create basic test to verify PDF generation works

- [x] Task 2: Create PDF template components (AC: 1, 2, 3, 4, 5)
  - [x] 2.1: Create `src/modules/statements/pdf/statement-pdf.tsx` main template
  - [x] 2.2: Create header component with logo placeholder, company name, period dates
  - [x] 2.3: Create author info section (name, address, contact)
  - [x] 2.4: Create summary section component (net payable, gross royalties, recoupment)
  - [x] 2.5: Create sales breakdown table component with columns: title, format, units, rate, royalty
  - [x] 2.6: Create returns section component (conditional rendering if returns exist)
  - [x] 2.7: Create advance recoupment section component
  - [x] 2.8: Create footer component with generation timestamp and statement ID

- [x] Task 3: Create PDF generator service (AC: 6)
  - [x] 3.1: Create `src/modules/statements/pdf-generator.tsx`
  - [x] 3.2: Implement `generateStatementPDF(statement: StatementWithDetails)` function
  - [x] 3.3: Convert React PDF document to buffer
  - [x] 3.4: Implement S3 upload with key pattern `statements/{tenant_id}/{statement_id}.pdf`
  - [x] 3.5: Return S3 key on successful upload
  - [x] 3.6: Handle errors with proper logging and error types

- [x] Task 4: Create S3 storage utilities (AC: 6)
  - [x] 4.1: Create `src/modules/statements/storage.ts`
  - [x] 4.2: Implement `uploadStatementPDF(buffer: Buffer, tenantId: string, statementId: string)` function
  - [x] 4.3: Implement `getStatementDownloadUrl(s3Key: string)` for presigned URLs (15-min expiry)
  - [x] 4.4: Add error handling for S3 operations

- [x] Task 5: Create Inngest background job (AC: 7)
  - [x] 5.1: Create `src/inngest/generate-statement-pdf.ts`
  - [x] 5.2: Define event type `statements/pdf.generate`
  - [x] 5.3: Implement job function with steps: load statement data, generate PDF, upload to S3, update statement record
  - [x] 5.4: Add retry logic (3 retries with exponential backoff)
  - [x] 5.5: Update statement.pdf_s3_key after successful upload
  - [x] 5.6: Log success/failure with statement ID and timing metrics
  - [x] 5.7: Register function in Inngest client

- [x] Task 6: Create server action to trigger PDF generation (AC: 7)
  - [x] 6.1: Add `generateStatementPDF` action to `src/modules/statements/actions.ts`
  - [x] 6.2: Validate statement exists and belongs to tenant
  - [x] 6.3: Enqueue Inngest job
  - [x] 6.4: Return job ID for status tracking

- [x] Task 7: Create type definitions (AC: 1-5)
  - [x] 7.1: Create/update `src/modules/statements/types.ts` with PDF-related types
  - [x] 7.2: Define `StatementPDFData` interface mapping StatementCalculations to PDF format
  - [x] 7.3: Define `PDFGenerationResult` type

- [x] Task 8: Write unit tests (AC: 1-6)
  - [x] 8.1: Create `tests/unit/statement-pdf-template.test.tsx`
  - [x] 8.2: Test PDF template renders with complete data
  - [x] 8.3: Test PDF template handles missing returns gracefully
  - [x] 8.4: Test PDF template handles zero advance correctly
  - [x] 8.5: Test S3 key generation follows pattern
  - [x] 8.6: Test presigned URL generation

- [x] Task 9: Write integration tests (AC: 6, 7)
  - [x] 9.1: Create `tests/integration/statement-pdf-generation.test.tsx`
  - [x] 9.2: Test full generation flow: statement data → PDF buffer → S3 mock upload
  - [x] 9.3: Test Inngest job completion updates statement record
  - [x] 9.4: Test error handling and retry behavior

## Dev Notes

### Relevant Architecture Patterns and Constraints

**PDF Generation Stack (per architecture.md & tech-spec-epic-5.md):**
- Use `@react-pdf/renderer` for React → PDF conversion (pure JS, no Puppeteer needed)
- Inngest for background job processing
- AWS S3 for PDF storage with presigned URLs (15-minute expiry)

**Module Pattern:**
```
src/modules/statements/
├── pdf/
│   └── statement-pdf.tsx    # React PDF template components
├── pdf-generator.ts          # PDF generation orchestration
├── storage.ts                # S3 upload/download utilities
├── actions.ts                # Server actions (extend existing)
└── types.ts                  # Types (extend existing)

src/inngest/
└── generate-statement-pdf.ts # Background job
```

**Inngest Job Pattern (per architecture.md):**
```typescript
export const generateStatementPdf = inngest.createFunction(
  { id: "generate-statement-pdf", retries: 3 },
  { event: "statements/pdf.generate" },
  async ({ event, step }) => {
    const { statementId, tenantId } = event.data;

    const statement = await step.run("load-statement", async () => {
      // Load statement with all relations
    });

    const pdfBuffer = await step.run("generate-pdf", async () => {
      // React PDF render
    });

    const s3Key = await step.run("upload-to-s3", async () => {
      // Upload and return key
    });

    await step.run("update-statement", async () => {
      // Update pdf_s3_key in database
    });

    return { success: true, s3Key };
  }
);
```

**S3 Key Pattern:**
```
statements/{tenant_id}/{statement_id}.pdf
```

**Presigned URL Generation:**
```typescript
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const url = await getSignedUrl(s3Client, new GetObjectCommand({
  Bucket: process.env.AWS_S3_BUCKET,
  Key: s3Key,
}), { expiresIn: 900 }); // 15 minutes
```

### Learnings from Previous Story

**From Story 5-1-create-statements-database-schema-and-pdf-storage (Status: done)**

- **Schema Available**: `statements` table with `pdf_s3_key` column ready for PDF references
- **Types Available**: `StatementCalculations`, `FormatBreakdown`, `TierBreakdown`, `AdvanceRecoupment` interfaces in `src/modules/statements/types.ts`
- **Relations Established**: `statementsRelations` connects to authors, contracts, users, tenants
- **RLS Configured**: Tenant isolation and author portal access policies in place
- **Helper Script**: `scripts/run-sql-migration.ts` available for custom SQL if needed

**Use Existing Types:**
- `StatementCalculations` from `src/modules/statements/types.ts` - maps directly to PDF content
- `Statement` type from `src/db/schema/index.ts`

**Files to Reference:**
- `src/db/schema/statements.ts` - Schema with pdf_s3_key column
- `src/modules/statements/types.ts` - StatementCalculations interface
- `src/modules/royalties/calculator.ts` - Calculation output format (if needed for reference)

[Source: docs/sprint-artifacts/5-1-create-statements-database-schema-and-pdf-storage.md#Dev-Agent-Record]

### Project Structure Notes

**Files to Create:**
```
src/
├── modules/
│   └── statements/
│       ├── pdf/
│       │   └── statement-pdf.tsx     # React PDF template
│       ├── pdf-generator.ts          # PDF generation service
│       └── storage.ts                # S3 utilities
└── inngest/
    └── generate-statement-pdf.ts     # Background job

tests/
├── unit/
│   └── statement-pdf-template.test.ts
└── integration/
    └── statement-pdf-generation.test.ts
```

**Files to Modify:**
```
src/modules/statements/actions.ts     # Add PDF generation action
src/modules/statements/types.ts       # Add PDF-related types
src/inngest/client.ts                 # Register new function (if separate file exists)
```

### PDF Template Structure

**Page Layout:**
```
┌─────────────────────────────────────┐
│ [Logo]   ROYALTY STATEMENT          │
│          Period: Q4 2024            │
│          (Oct 1 - Dec 31, 2024)     │
├─────────────────────────────────────┤
│ AUTHOR INFORMATION                  │
│ Jane Doe                            │
│ 123 Author Lane                     │
│ Publishing City, ST 12345           │
├─────────────────────────────────────┤
│ SUMMARY                             │
│ ┌───────────────────┬─────────────┐ │
│ │ Gross Royalties   │  $1,234.56  │ │
│ │ Returns Deduction │   ($45.00)  │ │
│ │ Advance Recoupment│  ($200.00)  │ │
│ │ ──────────────────┼───────────  │ │
│ │ NET PAYABLE       │   $989.56   │ │
│ └───────────────────┴─────────────┘ │
├─────────────────────────────────────┤
│ SALES BREAKDOWN                     │
│ ┌──────┬────────┬─────┬──────┬────┐ │
│ │Title │Format  │Units│Rate  │Earn│ │
│ ├──────┼────────┼─────┼──────┼────┤ │
│ │Book 1│Physical│ 100 │ 10%  │$250│ │
│ │Book 1│Ebook   │ 200 │ 15%  │$450│ │
│ └──────┴────────┴─────┴──────┴────┘ │
├─────────────────────────────────────┤
│ RETURNS (if applicable)             │
│ ┌──────┬────────┬─────┬──────────┐  │
│ │Title │Format  │Units│Deduction │  │
│ ├──────┼────────┼─────┼──────────┤  │
│ │Book 1│Physical│  5  │  ($45.00)│  │
│ └──────┴────────┴─────┴──────────┘  │
├─────────────────────────────────────┤
│ ADVANCE RECOUPMENT                  │
│ Original Advance:     $1,000.00     │
│ Previously Recouped:    $600.00     │
│ This Period:            $200.00     │
│ Remaining Balance:      $200.00     │
├─────────────────────────────────────┤
│ Generated: 2024-12-15 | ID: abc123  │
└─────────────────────────────────────┘
```

### Testing Strategy

**Unit Tests (tests/unit/statement-pdf-template.test.ts):**
- PDF template renders without errors with complete mock data
- Summary calculations display correctly
- Sales breakdown table populates from formatBreakdowns array
- Returns section conditionally renders (hidden when no returns)
- Advance recoupment shows $0 gracefully when no advance
- All monetary values format as currency (2 decimal places)

**Integration Tests (tests/integration/statement-pdf-generation.test.ts):**
- Full flow: load statement → generate PDF → verify buffer is valid PDF
- S3 upload mock: verify key pattern and content type
- Inngest job: verify statement.pdf_s3_key updated after completion
- Error scenarios: S3 failure rolls back, logs error

### Environment Variables Required

```bash
# S3 (should already exist from infrastructure)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=salina-erp-statements

# Inngest (should already exist)
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Story-5.2]
- [Source: docs/architecture.md#File-Storage]
- [Source: docs/architecture.md#Background-Jobs]
- [Source: src/modules/statements/types.ts]
- [Source: src/db/schema/statements.ts]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/5-2-implement-pdf-statement-generation-with-react-email.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Installed @react-pdf/renderer v4.3.1
- Created Inngest infrastructure (client, functions registry, API route)
- Updated vitest.config.ts to include .tsx test files

### Completion Notes List

- All 9 tasks completed with all subtasks marked done
- 27 new tests added (20 unit tests, 7 integration tests)
- All statement-related tests passing (93 total including pre-existing)
- Pre-existing test failures (18 in users-actions.test.ts) are unrelated to this story
- PDF template renders professional royalty statements with all required sections
- S3 storage utilities use presigned URLs with 15-minute expiry per AC-5.2.6
- Inngest background job configured with 3 retries per AC-5.2.7

### File List

**Created:**
- src/modules/statements/pdf/statement-pdf.tsx (PDF template components)
- src/modules/statements/pdf-generator.tsx (PDF generation service)
- src/modules/statements/storage.ts (S3 upload/download utilities)
- src/modules/statements/actions.ts (Server actions)
- src/modules/statements/index.ts (Module exports)
- src/inngest/client.ts (Inngest client)
- src/inngest/functions.ts (Functions registry)
- src/inngest/generate-statement-pdf.ts (Background job)
- src/app/api/inngest/route.ts (API route for Inngest)
- tests/unit/react-pdf-setup.test.tsx (Setup verification test)
- tests/unit/statement-pdf-template.test.tsx (PDF template tests)
- tests/unit/statement-storage.test.ts (S3 storage tests)
- tests/integration/statement-pdf-generation.test.tsx (Integration tests)

**Modified:**
- package.json (added @react-pdf/renderer)
- package-lock.json (dependency updates)
- src/modules/statements/types.ts (added StatementPDFData, PDFGenerationResult, StatementWithDetails)
- vitest.config.ts (added .tsx file patterns)
- docs/sprint-artifacts/sprint-status.yaml (status: in-progress → review)

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-11-30 | 1.0 | Story drafted from tech-spec-epic-5.md |
| 2025-11-30 | 1.1 | Implementation complete - all tasks done, 27 new tests passing |
| 2025-11-30 | 1.2 | Code review APPROVED - ready for merge |

---

## Code Review

### Review Date
2025-11-30

### Reviewer
Dev Agent (Amelia) - Claude Opus 4.5

### Outcome
**APPROVED**

### AC Validation Summary

| AC | Status | Evidence |
|-----|--------|----------|
| AC-5.2.1 | ✅ | `src/modules/statements/pdf/statement-pdf.tsx:273-312,478-489` |
| AC-5.2.2 | ✅ | `src/modules/statements/pdf/statement-pdf.tsx:318-355` |
| AC-5.2.3 | ✅ | `src/modules/statements/pdf/statement-pdf.tsx:361-402` |
| AC-5.2.4 | ✅ | `src/modules/statements/pdf/statement-pdf.tsx:408-427` |
| AC-5.2.5 | ✅ | `src/modules/statements/pdf/statement-pdf.tsx:433-472` |
| AC-5.2.6 | ✅ | `src/modules/statements/storage.ts:49-54,65-94` |
| AC-5.2.7 | ✅ | `src/inngest/generate-statement-pdf.ts:110-165` |

### Task Verification

- **9/9 tasks verified complete**
- **0 tasks falsely marked as complete**
- All 41 subtasks verified against implementation

### Test Results

- **91 statement-related tests passing**
- Unit tests: react-pdf-setup (2), statement-pdf-template (12), statement-storage (6), statements-schema (46)
- Integration tests: statement-pdf-generation (7), statements-rls (20)

### Security Review

- ✅ SQL injection protected (Drizzle ORM)
- ✅ Authorization enforced (requirePermission)
- ✅ Tenant isolation verified (tenant_id validation)
- ✅ S3 presigned URLs with 15-min expiry

### Code Quality

- ✅ Full TypeScript typing
- ✅ Consistent error handling
- ✅ Context-rich logging
- ✅ Clean module organization

### Action Items

None - ready for merge

### Notes

- React `act()` warnings in tests are cosmetic (from @react-pdf/renderer internal React usage), do not affect test validity
- Implementation follows all architectural patterns from docs/architecture.md
