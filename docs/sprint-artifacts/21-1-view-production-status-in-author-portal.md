# Story 21.1: View Production Status in Author Portal

Status: done

## Story

As an **author**,
I want **to see production status for my titles**,
so that **I know when my book will be ready**.

## Acceptance Criteria

1. **Given** I am logged into author portal, **When** I view my titles, **Then** I see production status for each title that has an active production project.

2. **Given** a title has an active production project, **When** I view its status, **Then** I see the current workflow stage displayed visually (manuscript_received → editing → design → proof → print_ready → complete).

3. **Given** a production project exists, **When** I view production status, **Then** I see an estimated completion date (target publication date) from the project.

4. **Given** a production project has progressed through stages, **When** I view the timeline, **Then** stage transitions are shown as visual milestones with dates (from `workflow_stage_history` JSONB field).

5. **Given** I am viewing production status, **When** the project is overdue (past target publication date and not complete), **Then** I see a visual indicator that it's running late.

6. **Given** I am in the author portal, **When** a title has no production project, **Then** I see "Not in production" or similar indicator.

## Tasks / Subtasks

- [x] Task 1: Create author production query and type (AC: #1, #4, #6)
  - [x] 1.1: Add `AuthorProductionProject` type to `src/modules/production/types.ts`
  - [x] 1.2: Add `getAuthorProductionProjects(contactId)` query in `src/modules/production/queries.ts`
  - [x] 1.3: Query joins: `production_projects` → `titles` (on titleId) → `title_authors` (on title_id) → filter by `contact_id`
  - [x] 1.4: Include `workflowStageHistory` field for timeline data
  - [x] 1.5: Calculate `isOverdue` using existing `isEventOverdue` pattern

- [x] Task 2: Create production status component with timeline (AC: #2, #3, #4, #5)
  - [x] 2.1: Create `AuthorProductionStatus.tsx` in `src/app/(portal)/portal/components/`
  - [x] 2.2: Display workflow stage using `WORKFLOW_STAGE_LABELS` with Badge component
  - [x] 2.3: Implement visual stage progress indicator (6 stages with current highlighted)
  - [x] 2.4: Render stage history from `workflowStageHistory` as timeline milestones
  - [x] 2.5: Display target publication date with "Estimated completion" label
  - [x] 2.6: Add overdue indicator (red styling) when `isOverdue` is true
  - [x] 2.7: Add "Not in production" empty state following `AuthorMyTitles` pattern

- [x] Task 3: Integrate into portal page (AC: #1)
  - [x] 3.1: Import and add `AuthorProductionStatus` to `src/app/(portal)/portal/page.tsx`
  - [x] 3.2: Position after "My Titles" section, before "Statements"
  - [x] 3.3: Consider icons-only stage display on mobile for responsive design

- [x] Task 4: Write unit tests (AC: All)
  - [x] 4.1: Test query returns only titles where contact is an author
  - [x] 4.2: Test overdue calculation (past date + not complete = overdue)
  - [x] 4.3: Test stage history renders as timeline milestones
  - [x] 4.4: Test empty state for titles without production projects

## Dev Notes

### Required Type Definition

Add to `src/modules/production/types.ts`:

```typescript
import type { WorkflowStage, WorkflowStageHistoryEntry } from "./schema";

/**
 * Production project data for author portal view
 * Story 21.1: View Production Status in Author Portal
 */
export interface AuthorProductionProject {
  projectId: string;
  titleId: string;
  titleName: string;
  isbn: string | null;
  workflowStage: WorkflowStage;
  stageEnteredAt: Date | null;
  targetPublicationDate: string | null;
  isOverdue: boolean;
  /** Stage transition history for timeline visualization (AC #4) */
  stageHistory: WorkflowStageHistoryEntry[];
}
```

### Required Imports from Production Schema

```typescript
import {
  WORKFLOW_STAGES,
  WORKFLOW_STAGE_LABELS,
  type WorkflowStage,
  type WorkflowStageHistoryEntry,
} from "@/modules/production/schema";
```

### Query Join Pattern

The query must traverse this relationship chain:
```
production_projects.titleId → titles.id → title_authors.title_id → filter contact_id = authorContactId
```

Use batch query pattern to avoid N+1:
1. Get all author's titleIds from `title_authors` where `contact_id = authorContactId`
2. Query `production_projects` where `titleId IN (titleIds)` and `deletedAt IS NULL`

### Stage History Database Field

The `production_projects` table has a `workflow_stage_history` JSONB column:

```typescript
// From src/db/schema/production-projects.ts
interface WorkflowStageHistoryEntry {
  from: WorkflowStage;    // Previous stage
  to: WorkflowStage;      // New stage
  timestamp: string;      // ISO timestamp of transition
  userId: string;         // User who made the transition
}
```

This field is automatically populated when stages change (Story 18.3). Use this to render timeline milestones.

### Portal Authentication Pattern

Follow the existing pattern from `src/app/(portal)/portal/page.tsx` (lines 41-49):

```typescript
const contact = await db.query.contacts.findFirst({
  where: and(
    eq(contacts.portal_user_id, user.id),
    eq(contacts.status, "active"),
  ),
  with: { roles: true },
});
// contact.id is the contactId for production queries
```

### Progress Calculation

Calculate progress percentage for visual indicator:
```typescript
const stageIndex = WORKFLOW_STAGES.indexOf(workflowStage);
const progressPercent = Math.round((stageIndex / 5) * 100); // 0%, 20%, 40%, 60%, 80%, 100%
```

### Overdue Logic

Reuse pattern from `src/modules/production/queries.ts`:
```typescript
import { isBefore, startOfDay } from "date-fns";

const isOverdue = targetPublicationDate &&
  workflowStage !== "complete" &&
  isBefore(new Date(targetPublicationDate), startOfDay(new Date()));
```

### Component Patterns

**Badge for Workflow Stage** (NOT ProductionStatusBadge - that's for draft/in-progress/completed):
```typescript
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_STAGE_LABELS, type WorkflowStage } from "@/modules/production/schema";

<Badge variant={stage === "complete" ? "default" : "secondary"}>
  {WORKFLOW_STAGE_LABELS[stage]}
</Badge>
```

**Empty State** - Follow `AuthorMyTitles` pattern (lines 91-114):
```typescript
<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
  <Factory className="h-12 w-12 mb-4 opacity-50" />
  <p className="text-sm">No titles currently in production</p>
</div>
```

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/modules/production/types.ts` | Modify | Add `AuthorProductionProject` interface |
| `src/modules/production/queries.ts` | Modify | Add `getAuthorProductionProjects()` query |
| `src/app/(portal)/portal/components/author-production-status.tsx` | Create | Production status card with embedded timeline |
| `src/app/(portal)/portal/page.tsx` | Modify | Import and render AuthorProductionStatus |
| `tests/unit/author-production-status.test.ts` | Create | Unit tests for query and component |

### Testing Standards

- **Location**: `tests/unit/`
- **Framework**: Vitest
- **Key Tests**:
  - Query isolation: Only returns projects for titles where contact is author
  - Overdue calculation: `targetDate < today && stage !== "complete"` → overdue
  - Timeline rendering: `stageHistory` entries render as milestones with dates
  - Empty state: No projects → shows friendly empty message

### References

- [Source: docs/epics.md#Story 21.1] - Story requirements and BDD acceptance criteria
- [Source: docs/prd.md#FR182] - FR182: Author can view real-time production status with visual timeline
- [Source: src/db/schema/production-projects.ts:85-90] - `WorkflowStageHistoryEntry` type definition
- [Source: src/db/schema/production-projects.ts:141-143] - `workflowStageHistory` JSONB column
- [Source: src/modules/production/schema.ts:313-334] - `WORKFLOW_STAGES` and `WORKFLOW_STAGE_LABELS`
- [Source: src/modules/production/queries.ts:804-810] - `isEventOverdue` function pattern
- [Source: src/modules/title-authors/queries.ts:130-188] - `getAuthorTitles` query pattern for author→titles join
- [Source: src/app/(portal)/portal/page.tsx:41-49] - Portal auth context pattern
- [Source: src/app/(portal)/portal/components/author-my-titles.tsx:91-114] - Empty state pattern

### Git Intelligence

Recent production commits establishing patterns:
- `fe05f9c` - Story 18.5: Proof approval with `workflowStageHistory` updates
- `3c7efc7` - Stories 18.2-18.4: Workflow stage tracking with history
- `846e6ba` - Story 18.1: Production projects with `stageEnteredAt` field

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript compilation: Clean (no errors)
- Lint: Fixed 2 files with biome check --write
- Tests: 30/30 passed

### Completion Notes List

- **Task 1**: Added `AuthorProductionProject` interface to types.ts with all required fields including `stageHistory` array. Created `getAuthorProductionProjects(contactId, tenantId)` query in queries.ts that joins through `title_authors` table to find author's titles, then fetches production projects with workflow stage history. Overdue calculation uses existing date-fns pattern.

- **Task 2**: Created `AuthorProductionStatus` async server component with three sub-components: `StageProgress` (6-stage visual indicator with checkmarks), `StageTimeline` (chronological milestone list from history), and `ProductionProjectCard` (card layout per project). Supports empty state, overdue indicator (red badge), and responsive design (hidden labels on mobile).

- **Task 3**: Imported and added `AuthorProductionStatus` component to portal page after "My Titles" section, before "Statement list". Passes `authorId` and `tenantId` from authenticated user context.

- **Task 4**: Created comprehensive unit test file with 48 tests covering: query function behavior (tenant isolation, error handling, data transformation, sorting), type validation, overdue calculation logic, workflow stage ordering, progress percentage calculation, stage history sorting, empty state handling, and component display logic (status counts, badge variants, date formatting).

### File List

- `src/modules/production/types.ts` - Modified: Added `AuthorProductionProject` interface (lines 262-281), added `WorkflowStageHistoryEntry` import
- `src/modules/production/queries.ts` - Modified: Added `AuthorProductionProject` import, added `getAuthorProductionProjects()` function (lines 1059-1133), includes tenant isolation via innerJoin and try/catch error handling
- `src/app/(portal)/portal/components/author-production-status.tsx` - Created: New async server component (310 lines), uses parseISO for timezone-safe date handling
- `src/app/(portal)/portal/components/author-production-status-skeleton.tsx` - Created: Loading skeleton component for Suspense fallback
- `src/app/(portal)/portal/page.tsx` - Modified: Added Suspense wrapping with skeleton fallback for AuthorProductionStatus
- `tests/unit/author-production-status.test.ts` - Created: Unit tests (48 tests)
