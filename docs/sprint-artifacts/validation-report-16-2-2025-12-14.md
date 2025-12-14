# Validation Report

**Document:** docs/sprint-artifacts/16-2-schedule-automated-onix-feeds-to-ingram.md
**Checklist:** .bmad/bmm/workflows/4-implementation/create-story/checklist.md
**Date:** 2025-12-14

## Summary
- Overall: 12/17 items passed (71%)
- Critical Issues: 4
- High Priority Issues: 3

## Section Results

### Code Reuse & Anti-Pattern Prevention
Pass Rate: 3/4 (75%)

✓ **PASS** - Inngest pattern reuse identified
Evidence: Lines 100, 198-427 show comprehensive Inngest job pattern following `generate-statements-batch.ts`

✓ **PASS** - ONIX Builder reuse identified
Evidence: Line 101 - "Use `src/modules/onix/builder/message-builder.ts` with version `"3.0"`"

✓ **PASS** - FTP Client reuse identified
Evidence: Line 102 - "Reuse `src/modules/channels/adapters/ingram/ftp-client.ts` - `uploadToIngram` is ready"

✗ **FAIL** - Non-existent function referenced: `getTitlesWithAuthorsAdmin`
Evidence: Lines 223, 301 reference function that doesn't exist in codebase
Impact: **Code will not compile.** Developer must rewrite title fetching logic using existing patterns from `src/modules/onix/actions.ts` lines 204-219.

### Technical Specification Completeness
Pass Rate: 4/6 (67%)

✓ **PASS** - Database schema provided
Evidence: Lines 109-155 define complete `channel_feeds` table with types

✓ **PASS** - Inngest event definition provided
Evidence: Lines 175-192 define `"channel/ingram.feed"` event interface

✓ **PASS** - UI components fully specified
Evidence: Lines 521-841 provide complete React components with Zod schemas

✓ **PASS** - Server actions defined
Evidence: Lines 848-920 define `triggerIngramFeed` and `saveIngramSchedule`

⚠ **PARTIAL** - Schedule storage location ambiguous
Evidence: Lines 159-169 say "Recommended: Store schedule config in a separate `channel_schedules` table for clarity, OR in the `metadata` JSONB field"
Gap: No definitive decision; developer must choose between options

✗ **FAIL** - Schedule matching logic incomplete (TODO placeholder)
Evidence: Lines 485-492 contain:
```typescript
// TODO: Implement schedule checking logic
return false; // Placeholder
```
Impact: **Scheduler will never trigger feeds.** This core functionality is missing implementation guidance.

### File Structure & Organization
Pass Rate: 3/4 (75%)

✓ **PASS** - New file locations specified
Evidence: Lines 1046-1061 list all new and modified files with paths

✓ **PASS** - Schema export instruction included
Evidence: Line 1056 - "Export from: `src/db/schema/index.ts`"

✓ **PASS** - Module structure follows architecture
Evidence: Files placed in `src/modules/channels/adapters/ingram/` per ADR-011

⚠ **PARTIAL** - Missing explicit instruction to register Inngest scheduler
Evidence: Line 1058 says "Register ingramFeed and scheduler" but scheduler function registration not shown in code example at lines 434-442

### Bug Prevention & Code Quality
Pass Rate: 1/2 (50%)

✓ **PASS** - Error handling comprehensive
Evidence: Lines 413-425 show proper error handling with status updates and re-throw for retry

✗ **FAIL** - File stat attempted after deletion
Evidence: Lines 379-400 show:
```typescript
// Step 9: Clean up temp file
await fs.unlink(tempFilePath);  // File deleted

// Step 10: Update feed record
const fileStats = await fs.stat(tempFilePath).catch(() => null);  // After deletion!
```
Impact: Will always get null fileStats. Should stat before cleanup.

### Implementation Clarity
Pass Rate: 1/1 (100%)

✓ **PASS** - Acceptance criteria well-defined with BDD format
Evidence: Lines 27-83 provide 7 ACs with Given/When/Then format

---

## Failed Items

### 1. ✗ Non-existent function `getTitlesWithAuthorsAdmin`
**Severity:** Critical
**Location:** Lines 223, 301
**Recommendation:** Replace with pattern from `src/modules/onix/actions.ts`:
```typescript
const titles = await adminDb.query.titles.findMany({
  where: eq(titles.tenant_id, tenantId),
});

const titlesToExport = [];
for (const title of titles) {
  const titleWithAuthors = await getTitleWithAuthors(title.id);
  if (titleWithAuthors) {
    titlesToExport.push(titleWithAuthors);
  }
}
```

### 2. ✗ Schedule matching logic is a TODO placeholder
**Severity:** Critical
**Location:** Lines 485-492
**Recommendation:** Implement schedule matching:
```typescript
const shouldTrigger = await step.run(`check-schedule-${connection.tenantId}`, async () => {
  // Get schedule from metadata or separate table
  const schedule = JSON.parse(connection.metadata || "{}").schedule;
  if (!schedule || schedule.frequency === "disabled") return false;

  if (schedule.frequency === "daily" && schedule.hour === currentHour) {
    return true;
  }

  if (schedule.frequency === "weekly" &&
      schedule.dayOfWeek === currentDay &&
      schedule.hour === currentHour) {
    return true;
  }

  return false;
});
```

### 3. ✗ File stat after deletion bug
**Severity:** High
**Location:** Lines 379-400
**Recommendation:** Move fileStats before cleanup:
```typescript
// Get file size BEFORE cleanup
const fileStats = await fs.stat(tempFilePath).catch(() => null);

// Step 9: Clean up temp file
await step.run("cleanup", async () => {
  try {
    await fs.unlink(tempFilePath);
  } catch {
    // Ignore cleanup errors
  }
});

// Step 10: Update feed record (use fileStats captured above)
```

---

## Partial Items

### 1. ⚠ Schedule storage location not decided
**Location:** Lines 159-169
**Gap:** Story gives options but doesn't choose
**Recommendation:** Commit to storing in `channelCredentials` metadata JSONB field since:
- Simpler (no new table)
- Already has tenant context
- Can be encrypted with credentials

### 2. ⚠ Inngest scheduler registration incomplete
**Location:** Lines 434-442
**Gap:** Shows only `ingramFeed` in functions array, not `ingramFeedScheduler`
**Recommendation:** Update to:
```typescript
import { ingramFeed, ingramFeedScheduler } from "./ingram-feed";

export const functions = [
  generateStatementPdf,
  generateStatementsBatch,
  generateIsbnPrefixes,
  ingramFeed,
  ingramFeedScheduler, // Add scheduler
];
```

---

## Recommendations

### Must Fix (Critical)
1. Replace `getTitlesWithAuthorsAdmin` with working pattern using loop + `getTitleWithAuthors()`
2. Implement schedule matching logic (remove TODO placeholder)
3. Fix file stat ordering bug (stat before delete)

### Should Improve (Important)
4. Commit to schedule storage decision (recommend: metadata JSONB)
5. Add `ingramFeedScheduler` to functions registry example
6. Explain when/why to use `adminDb` vs `db` (Inngest bypasses request context)

### Consider (Enhancement)
7. Add note about `updated_at` timestamp maintenance for delta feeds
8. Document FTP file size limits if any
9. Add timezone handling notes for schedule configuration
