# Story 21.5: View Publication Schedule

Status: done

## Story

As an **author**,
I want **to see scheduled publication dates in a calendar view**,
so that **I can plan marketing activities around my book releases**.

## Acceptance Criteria

1. **Given** I have titles in production, **When** I access the Publication Schedule page in the author portal, **Then** I see all my scheduled publication dates in a timeline view grouped by month.

2. **Given** I view the Publication Schedule, **When** dates are displayed, **Then** each entry shows the title name, ISBN (if assigned), current production stage, and target publication date.

3. **Given** production progresses, **When** target publication dates are updated by staff, **Then** I see the updated dates reflected on my schedule automatically.

4. **Given** I want to sync with my personal calendar, **When** I click an export option, **Then** I can download an iCal (.ics) file with all publication events.

5. **Given** I have no titles in production, **When** I access the Publication Schedule page, **Then** I see an appropriate empty state explaining no scheduled publications.

6. **Given** a publication date is in the past and the book is not complete, **When** I view the schedule, **Then** that entry is visually marked as overdue.

7. **Given** I have projects without a target publication date, **When** I view the schedule, **Then** those projects appear in a separate "Unscheduled" section at the bottom.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/app/(portal)/portal/schedule/page.tsx` | Create | Publication schedule page |
| `src/app/(portal)/portal/components/author-publication-schedule.tsx` | Create | Schedule timeline component |
| `src/app/(portal)/portal/components/author-publication-schedule-skeleton.tsx` | Create | Loading skeleton |
| `src/app/api/portal/schedule/ical/route.ts` | Create | iCal download API endpoint |
| `src/app/(portal)/layout.tsx` | Modify | Add Schedule navigation link |
| `tests/unit/author-publication-schedule.test.ts` | Create | Unit tests |

## Tasks / Subtasks

- [x] Task 1: Create publication schedule page (AC: #1, #5)
  - [x] 1.1: Create `src/app/(portal)/portal/schedule/page.tsx`
  - [x] 1.2: Use portal auth pattern (see Dev Notes below)
  - [x] 1.3: Add Suspense with skeleton fallback

- [x] Task 2: Create publication schedule component (AC: #1, #2, #3, #6, #7)
  - [x] 2.1: Create `src/app/(portal)/portal/components/author-publication-schedule.tsx`
  - [x] 2.2: Call `getAuthorProductionProjects(contactId, tenantId)` from `@/modules/production/queries`
  - [x] 2.3: Filter projects: scheduled (has targetPublicationDate) vs unscheduled (null)
  - [x] 2.4: Group scheduled projects by month using `format(parseISO(date), 'MMMM yyyy')`
  - [x] 2.5: Render each entry with: title name, ISBN, stage Badge, date, overdue Badge if applicable
  - [x] 2.6: Render "Unscheduled" section at bottom for projects without dates
  - [x] 2.7: Create empty state when no projects exist

- [x] Task 3: Create skeleton component (AC: #1)
  - [x] 3.1: Create `author-publication-schedule-skeleton.tsx`
  - [x] 3.2: Follow pattern from `author-production-status-skeleton.tsx`

- [x] Task 4: Implement iCal export API (AC: #4)
  - [x] 4.1: Create `src/app/api/portal/schedule/ical/route.ts`
  - [x] 4.2: Authenticate portal user (see API Auth Pattern below)
  - [x] 4.3: Query projects and transform to CalendarEvent format:
    ```typescript
    function toCalendarEvents(projects: AuthorProductionProject[]): CalendarEvent[] {
      return projects
        .filter(p => p.targetPublicationDate !== null)
        .map(p => ({
          id: `pub-${p.projectId}`,
          title: `📚 ${p.titleName} Publication`,
          start: parseISO(p.targetPublicationDate!),
          end: parseISO(p.targetPublicationDate!),
          type: 'publication_date' as const,
          projectId: p.projectId,
          projectTitle: p.titleName,
          workflowStage: p.workflowStage,
          isOverdue: p.isOverdue,
        }));
    }
    ```
  - [x] 4.4: Use `generateICalExport(events)` from `@/modules/production/utils/ical-export`
  - [x] 4.5: Return with headers:
    ```typescript
    return new Response(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="my-publication-schedule.ics"',
      },
    });
    ```
  - [x] 4.6: Add "Export to Calendar" button in schedule component header

- [x] Task 5: Add navigation link (AC: #1)
  - [x] 5.1: Add "Schedule" link to portal layout between Manuscripts and Settings

- [x] Task 6: Write unit tests (AC: All)
  - [x] 6.1: Test schedule with mixed projects (dated, undated, overdue, complete)
  - [x] 6.2: Test empty state
  - [x] 6.3: Test month grouping logic
  - [x] 6.4: Test iCal transformation function
  - [x] 6.5: Test API endpoint authentication

## Dev Notes

### Portal Page Auth Pattern
```typescript
// src/app/(portal)/portal/schedule/page.tsx
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contacts } from "@/db/schema/contacts";
import { getCurrentUser, getDb } from "@/lib/auth";

export default async function SchedulePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "author") redirect("/sign-in");

  const db = await getDb();
  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.portal_user_id, user.id),
      eq(contacts.status, "active"),
    ),
    with: { roles: true },
  });

  if (!contact || !contact.roles.some((r) => r.role === "author")) {
    return <div>Author profile not found</div>;
  }

  return (
    <Suspense fallback={<AuthorPublicationScheduleSkeleton />}>
      <AuthorPublicationSchedule contactId={contact.id} tenantId={user.tenant_id} />
    </Suspense>
  );
}
```

### API Route Auth Pattern (First Portal API Route)
```typescript
// src/app/api/portal/schedule/ical/route.ts
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { contacts, users } from "@/db/schema";

export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get internal user
  const user = await adminDb.query.users.findFirst({
    where: eq(users.clerk_user_id, clerkUserId),
  });
  if (!user || user.role !== "author") {
    return new Response("Forbidden", { status: 403 });
  }

  // Get author's contact
  const contact = await adminDb.query.contacts.findFirst({
    where: and(
      eq(contacts.portal_user_id, user.id),
      eq(contacts.status, "active"),
    ),
  });
  if (!contact) {
    return new Response("Author not found", { status: 404 });
  }

  // Now use contact.id and user.tenant_id for queries...
}
```

### Key Imports and Utilities
- **Query**: `getAuthorProductionProjects` from `@/modules/production/queries`
- **Types**: `AuthorProductionProject`, `CalendarEvent` from `@/modules/production/types`
- **iCal**: `generateICalExport` from `@/modules/production/utils/ical-export` (uses `ics` v3.8.1)
- **UI**: `WORKFLOW_STAGE_LABELS` from `@/modules/production/schema`
- **Date**: `format`, `parseISO` from `date-fns`

### Month Grouping Pattern
```typescript
import { format, parseISO } from "date-fns";

// Group projects by month
const grouped = projects.reduce((acc, project) => {
  if (!project.targetPublicationDate) return acc;
  const monthKey = format(parseISO(project.targetPublicationDate), "MMMM yyyy");
  if (!acc[monthKey]) acc[monthKey] = [];
  acc[monthKey].push(project);
  return acc;
}, {} as Record<string, AuthorProductionProject[]>);
```

### UI Components
- Card, CardHeader, CardTitle, CardContent from `@/components/ui/card`
- Badge for stage display (use `WORKFLOW_STAGE_LABELS[workflowStage]`)
- Button with Download icon for export
- Calendar icon from lucide-react
- AlertCircle + destructive Badge for overdue

### References
- [Source: src/app/(portal)/portal/components/author-production-status.tsx] - UI patterns, overdue logic
- [Source: src/modules/production/utils/ical-export.ts] - iCal generation with CalendarEvent type

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None required.

### Completion Notes List

1. Created publication schedule page with portal auth pattern using Clerk authentication
2. Created schedule component with month grouping, date sorting, overdue indicators
3. Implemented "Unscheduled" section for projects without target dates (AC-21.5.7)
4. Created iCal API route as first portal API endpoint with proper auth
5. Added "Schedule" navigation link between Manuscripts and Settings
6. Created 34 comprehensive unit tests covering all acceptance criteria
7. TypeScript clean, lint clean (6 style warnings for non-null assertions are safe due to filter)

### File List

- src/app/(portal)/portal/schedule/page.tsx (created)
- src/app/(portal)/portal/components/author-publication-schedule.tsx (created)
- src/app/(portal)/portal/components/author-publication-schedule-skeleton.tsx (created)
- src/app/api/portal/schedule/ical/route.ts (created)
- src/app/(portal)/layout.tsx (modified - added Schedule nav link)
- tests/unit/author-publication-schedule.test.ts (created)
- docs/sprint-artifacts/sprint-status.yaml (modified - story status tracking)

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.5 | **Date:** 2025-12-21

### Issues Found: 1 High, 3 Medium, 3 Low

| Severity | Issue | Fix Applied |
|----------|-------|-------------|
| HIGH | H1: Month sorting used locale-dependent `new Date()` parsing | ✅ Replaced with explicit month/year parsing |
| MEDIUM | M1: API route missing error handling | ✅ Added try/catch with 500 response |
| MEDIUM | M2: iCal returned 404 for empty events | ✅ Returns valid empty calendar |
| MEDIUM | M3: File List missing sprint-status.yaml | ✅ Added to File List |
| LOW | L1: Missing page metadata | ✅ Added title/description |
| LOW | L2: Tests re-implement logic | ✅ Synced test sorting with component |
| LOW | L3: Missing aria-label on export button | ✅ Added accessibility label |

### Verification
- All acceptance criteria implemented ✅
- All tasks marked [x] verified complete ✅
- TypeScript clean ✅
- Tests passing ✅

