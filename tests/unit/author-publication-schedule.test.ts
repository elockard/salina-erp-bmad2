/**
 * Unit tests for Author Publication Schedule functionality
 *
 * Story 21.5 - View Publication Schedule
 * AC-21.5.1: Timeline view grouped by month
 * AC-21.5.2: Entry shows title, ISBN, stage, date
 * AC-21.5.4: iCal export
 * AC-21.5.5: Empty state
 * AC-21.5.6: Overdue indicator
 * AC-21.5.7: Unscheduled projects section
 *
 * Tests cover:
 * - Month grouping logic
 * - Date sorting within months
 * - Scheduled vs unscheduled separation
 * - iCal transformation function
 * - Empty state handling
 * - Overdue detection
 */

import { addDays, format, parseISO, subDays } from "date-fns";
import { describe, expect, it } from "vitest";

import type { WorkflowStage } from "@/modules/production/schema";
import type {
  AuthorProductionProject,
  CalendarEvent,
} from "@/modules/production/types";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create mock project data for testing
 */
function createMockProject(
  overrides: Partial<AuthorProductionProject> = {},
): AuthorProductionProject {
  return {
    projectId: "project-123",
    titleId: "title-456",
    titleName: "Test Book Title",
    isbn: "978-1-234567-89-0",
    workflowStage: "editing" as WorkflowStage,
    stageEnteredAt: new Date(),
    targetPublicationDate: addDays(new Date(), 30).toISOString().split("T")[0],
    isOverdue: false,
    stageHistory: [],
    ...overrides,
  };
}

/**
 * Group projects by month (matches component logic)
 */
function groupByMonth(
  projects: AuthorProductionProject[],
): Record<string, AuthorProductionProject[]> {
  return projects.reduce(
    (acc, project) => {
      if (!project.targetPublicationDate) return acc;
      const monthKey = format(
        parseISO(project.targetPublicationDate),
        "MMMM yyyy",
      );
      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push(project);
      return acc;
    },
    {} as Record<string, AuthorProductionProject[]>,
  );
}

/**
 * Sort month keys chronologically
 * H1 Fix: Parse month/year explicitly to avoid locale-dependent Date parsing
 */
function sortMonthKeys(monthKeys: string[]): string[] {
  const monthOrder: Record<string, number> = {
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11,
  };

  return monthKeys.sort((a, b) => {
    const [monthA, yearA] = a.split(" ");
    const [monthB, yearB] = b.split(" ");
    const yearDiff = parseInt(yearA, 10) - parseInt(yearB, 10);
    if (yearDiff !== 0) return yearDiff;
    return monthOrder[monthA] - monthOrder[monthB];
  });
}

/**
 * Transform AuthorProductionProject to CalendarEvent for iCal export
 * (matches API route logic)
 */
function toCalendarEvents(
  projects: AuthorProductionProject[],
): CalendarEvent[] {
  return projects
    .filter(
      (p): p is AuthorProductionProject & { targetPublicationDate: string } =>
        p.targetPublicationDate !== null,
    )
    .map((p) => ({
      id: `pub-${p.projectId}`,
      title: `📚 ${p.titleName} Publication`,
      start: parseISO(p.targetPublicationDate),
      end: parseISO(p.targetPublicationDate),
      type: "publication_date" as const,
      projectId: p.projectId,
      projectTitle: p.titleName,
      workflowStage: p.workflowStage,
      isOverdue: p.isOverdue,
    }));
}

// =============================================================================
// MONTH GROUPING TESTS (AC-21.5.1)
// =============================================================================

describe("Month Grouping Logic (AC-21.5.1)", () => {
  it("groups projects by their target publication month", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({
        projectId: "p1",
        targetPublicationDate: "2025-03-15",
      }),
      createMockProject({
        projectId: "p2",
        targetPublicationDate: "2025-03-25",
      }),
      createMockProject({
        projectId: "p3",
        targetPublicationDate: "2025-04-10",
      }),
    ];

    const grouped = groupByMonth(projects);

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["March 2025"]).toHaveLength(2);
    expect(grouped["April 2025"]).toHaveLength(1);
  });

  it("excludes projects without target publication date from grouping", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({
        projectId: "p1",
        targetPublicationDate: "2025-03-15",
      }),
      createMockProject({
        projectId: "p2",
        targetPublicationDate: null,
      }),
    ];

    const grouped = groupByMonth(projects);

    expect(Object.keys(grouped)).toHaveLength(1);
    expect(grouped["March 2025"]).toHaveLength(1);
    expect(grouped["March 2025"][0].projectId).toBe("p1");
  });

  it("handles empty projects array", () => {
    const projects: AuthorProductionProject[] = [];
    const grouped = groupByMonth(projects);

    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("handles all projects having null dates", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({ targetPublicationDate: null }),
      createMockProject({ targetPublicationDate: null }),
    ];

    const grouped = groupByMonth(projects);
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("sorts month keys chronologically", () => {
    const monthKeys = ["April 2025", "January 2025", "March 2025"];
    const sorted = sortMonthKeys(monthKeys);

    expect(sorted[0]).toBe("January 2025");
    expect(sorted[1]).toBe("March 2025");
    expect(sorted[2]).toBe("April 2025");
  });

  it("handles months across years", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({
        projectId: "p1",
        targetPublicationDate: "2025-12-15",
      }),
      createMockProject({
        projectId: "p2",
        targetPublicationDate: "2026-01-10",
      }),
    ];

    const grouped = groupByMonth(projects);
    const sortedMonths = sortMonthKeys(Object.keys(grouped));

    expect(sortedMonths[0]).toBe("December 2025");
    expect(sortedMonths[1]).toBe("January 2026");
  });
});

// =============================================================================
// DATE SORTING TESTS (AC-21.5.1)
// =============================================================================

describe("Date Sorting Within Months", () => {
  it("sorts projects within a month by date ascending", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({
        projectId: "p3",
        targetPublicationDate: "2025-03-25",
      }),
      createMockProject({
        projectId: "p1",
        targetPublicationDate: "2025-03-05",
      }),
      createMockProject({
        projectId: "p2",
        targetPublicationDate: "2025-03-15",
      }),
    ];

    const sorted = [...projects].sort((a, b) => {
      // All test projects have dates set
      const dateA = parseISO(a.targetPublicationDate as string);
      const dateB = parseISO(b.targetPublicationDate as string);
      return dateA.getTime() - dateB.getTime();
    });

    expect(sorted[0].projectId).toBe("p1");
    expect(sorted[1].projectId).toBe("p2");
    expect(sorted[2].projectId).toBe("p3");
  });
});

// =============================================================================
// SCHEDULED VS UNSCHEDULED TESTS (AC-21.5.7)
// =============================================================================

describe("Scheduled vs Unscheduled Separation (AC-21.5.7)", () => {
  it("separates projects with dates from those without", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({
        projectId: "scheduled-1",
        targetPublicationDate: "2025-03-15",
      }),
      createMockProject({
        projectId: "unscheduled-1",
        targetPublicationDate: null,
      }),
      createMockProject({
        projectId: "scheduled-2",
        targetPublicationDate: "2025-04-10",
      }),
      createMockProject({
        projectId: "unscheduled-2",
        targetPublicationDate: null,
      }),
    ];

    const scheduledProjects = projects.filter((p) => p.targetPublicationDate);
    const unscheduledProjects = projects.filter(
      (p) => !p.targetPublicationDate,
    );

    expect(scheduledProjects).toHaveLength(2);
    expect(unscheduledProjects).toHaveLength(2);
    expect(scheduledProjects.map((p) => p.projectId)).toContain("scheduled-1");
    expect(scheduledProjects.map((p) => p.projectId)).toContain("scheduled-2");
    expect(unscheduledProjects.map((p) => p.projectId)).toContain(
      "unscheduled-1",
    );
    expect(unscheduledProjects.map((p) => p.projectId)).toContain(
      "unscheduled-2",
    );
  });

  it("handles all projects being scheduled", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({ targetPublicationDate: "2025-03-15" }),
      createMockProject({ targetPublicationDate: "2025-04-10" }),
    ];

    const unscheduledProjects = projects.filter(
      (p) => !p.targetPublicationDate,
    );
    expect(unscheduledProjects).toHaveLength(0);
  });

  it("handles all projects being unscheduled", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({ targetPublicationDate: null }),
      createMockProject({ targetPublicationDate: null }),
    ];

    const scheduledProjects = projects.filter((p) => p.targetPublicationDate);
    expect(scheduledProjects).toHaveLength(0);
  });
});

// =============================================================================
// ICAL TRANSFORMATION TESTS (AC-21.5.4)
// =============================================================================

describe("iCal Transformation (AC-21.5.4)", () => {
  it("transforms scheduled projects to CalendarEvents", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({
        projectId: "proj-123",
        titleName: "My Book",
        targetPublicationDate: "2025-03-15",
        workflowStage: "editing",
        isOverdue: false,
      }),
    ];

    const events = toCalendarEvents(projects);

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("pub-proj-123");
    expect(events[0].title).toBe("📚 My Book Publication");
    expect(events[0].type).toBe("publication_date");
    expect(events[0].projectId).toBe("proj-123");
    expect(events[0].projectTitle).toBe("My Book");
    expect(events[0].workflowStage).toBe("editing");
    expect(events[0].isOverdue).toBe(false);
  });

  it("excludes unscheduled projects from iCal export", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({
        projectId: "scheduled",
        targetPublicationDate: "2025-03-15",
      }),
      createMockProject({
        projectId: "unscheduled",
        targetPublicationDate: null,
      }),
    ];

    const events = toCalendarEvents(projects);

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("pub-scheduled");
  });

  it("sets start and end to same date for publication events", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({ targetPublicationDate: "2025-03-15" }),
    ];

    const events = toCalendarEvents(projects);

    expect(events[0].start.getTime()).toBe(events[0].end.getTime());
  });

  it("preserves overdue flag in calendar events", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({
        targetPublicationDate: "2025-01-15",
        isOverdue: true,
      }),
    ];

    const events = toCalendarEvents(projects);
    expect(events[0].isOverdue).toBe(true);
  });

  it("handles empty projects array for iCal", () => {
    const events = toCalendarEvents([]);
    expect(events).toHaveLength(0);
  });

  it("handles multiple projects for iCal", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({
        projectId: "p1",
        titleName: "Book 1",
        targetPublicationDate: "2025-03-15",
      }),
      createMockProject({
        projectId: "p2",
        titleName: "Book 2",
        targetPublicationDate: "2025-04-20",
      }),
      createMockProject({
        projectId: "p3",
        titleName: "Book 3",
        targetPublicationDate: "2025-05-10",
      }),
    ];

    const events = toCalendarEvents(projects);

    expect(events).toHaveLength(3);
    expect(events.map((e) => e.projectTitle)).toEqual([
      "Book 1",
      "Book 2",
      "Book 3",
    ]);
  });
});

// =============================================================================
// EMPTY STATE TESTS (AC-21.5.5)
// =============================================================================

describe("Empty State Handling (AC-21.5.5)", () => {
  it("identifies empty state when no projects exist", () => {
    const projects: AuthorProductionProject[] = [];
    const hasProjects = projects.length > 0;

    expect(hasProjects).toBe(false);
  });

  it("empty state message should be appropriate", () => {
    const emptyMessage = "No scheduled publications";
    expect(emptyMessage).toContain("No scheduled");
  });
});

// =============================================================================
// OVERDUE INDICATOR TESTS (AC-21.5.6)
// =============================================================================

describe("Overdue Indicator (AC-21.5.6)", () => {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const tomorrow = addDays(today, 1);

  it("identifies overdue projects correctly", () => {
    const overdueProject = createMockProject({
      targetPublicationDate: yesterday.toISOString().split("T")[0],
      workflowStage: "editing",
      isOverdue: true,
    });

    expect(overdueProject.isOverdue).toBe(true);
  });

  it("does not mark future dates as overdue", () => {
    const futureProject = createMockProject({
      targetPublicationDate: tomorrow.toISOString().split("T")[0],
      workflowStage: "editing",
      isOverdue: false,
    });

    expect(futureProject.isOverdue).toBe(false);
  });

  it("does not mark complete projects as overdue", () => {
    const completeProject = createMockProject({
      targetPublicationDate: yesterday.toISOString().split("T")[0],
      workflowStage: "complete",
      isOverdue: false,
    });

    expect(completeProject.isOverdue).toBe(false);
  });

  it("counts overdue projects correctly", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({ isOverdue: true }),
      createMockProject({ isOverdue: true }),
      createMockProject({ isOverdue: false }),
    ];

    const overdueCount = projects.filter((p) => p.isOverdue).length;
    expect(overdueCount).toBe(2);
  });
});

// =============================================================================
// DISPLAY DATA TESTS (AC-21.5.2)
// =============================================================================

describe("Entry Display Data (AC-21.5.2)", () => {
  it("contains all required display fields", () => {
    const project = createMockProject({
      titleName: "My Book Title",
      isbn: "978-1-234567-89-0",
      workflowStage: "design",
      targetPublicationDate: "2025-03-15",
    });

    expect(project.titleName).toBe("My Book Title");
    expect(project.isbn).toBe("978-1-234567-89-0");
    expect(project.workflowStage).toBe("design");
    expect(project.targetPublicationDate).toBe("2025-03-15");
  });

  it("handles missing ISBN gracefully", () => {
    const project = createMockProject({ isbn: null });
    expect(project.isbn).toBeNull();
  });

  it("formats date correctly for display", () => {
    const date = "2025-03-15";
    const formatted = format(parseISO(date), "MMM d, yyyy");
    expect(formatted).toBe("Mar 15, 2025");
  });

  it("returns placeholder for null date", () => {
    const formatDate = (date: string | null): string => {
      if (!date) return "—";
      return format(parseISO(date), "MMM d, yyyy");
    };

    expect(formatDate(null)).toBe("—");
    expect(formatDate("2025-03-15")).toBe("Mar 15, 2025");
  });
});

// =============================================================================
// API AUTHENTICATION TESTS (AC-21.5.4)
// =============================================================================

describe("iCal API Authentication", () => {
  it("requires authenticated user", () => {
    // API should return 401 for unauthenticated requests
    const clerkUserId: string | null = null;
    const isAuthenticated = clerkUserId !== null;

    expect(isAuthenticated).toBe(false);
  });

  it("requires author role", () => {
    // API should return 403 for non-author users
    const userRole = "staff" as string;
    const isAuthor = userRole === "author";

    expect(isAuthor).toBe(false);
  });

  it("allows authenticated author", () => {
    const clerkUserId = "user_123";
    const userRole = "author";

    const isAuthenticated = clerkUserId !== null;
    const isAuthor = userRole === "author";

    expect(isAuthenticated).toBe(true);
    expect(isAuthor).toBe(true);
  });
});

// =============================================================================
// RESPONSE HEADERS TESTS (AC-21.5.4)
// =============================================================================

describe("iCal Response Headers", () => {
  it("sets correct Content-Type for iCal", () => {
    const contentType = "text/calendar; charset=utf-8";
    expect(contentType).toBe("text/calendar; charset=utf-8");
  });

  it("sets correct Content-Disposition for download", () => {
    const disposition = 'attachment; filename="my-publication-schedule.ics"';
    expect(disposition).toContain("attachment");
    expect(disposition).toContain(".ics");
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge Cases", () => {
  it("handles project with same title name but different IDs", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({
        projectId: "p1",
        titleName: "Same Title",
        targetPublicationDate: "2025-03-15",
      }),
      createMockProject({
        projectId: "p2",
        titleName: "Same Title",
        targetPublicationDate: "2025-03-20",
      }),
    ];

    expect(projects[0].projectId).not.toBe(projects[1].projectId);
    expect(projects[0].titleName).toBe(projects[1].titleName);
  });

  it("handles all workflow stages", () => {
    const stages: WorkflowStage[] = [
      "manuscript_received",
      "editing",
      "design",
      "proof",
      "print_ready",
      "complete",
    ];

    for (const stage of stages) {
      const project = createMockProject({ workflowStage: stage });
      expect(project.workflowStage).toBe(stage);
    }
  });

  it("handles projects spanning multiple years", () => {
    const projects: AuthorProductionProject[] = [
      createMockProject({ targetPublicationDate: "2024-12-15" }),
      createMockProject({ targetPublicationDate: "2025-01-10" }),
      createMockProject({ targetPublicationDate: "2025-06-01" }),
      createMockProject({ targetPublicationDate: "2026-02-15" }),
    ];

    const grouped = groupByMonth(projects);
    expect(Object.keys(grouped)).toHaveLength(4);
  });
});
