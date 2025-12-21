/**
 * Author Publication Schedule Component
 *
 * Displays publication schedule grouped by month with iCal export.
 *
 * Story: 21.5 - View Publication Schedule
 * AC-21.5.1: Timeline view grouped by month
 * AC-21.5.2: Entry shows title, ISBN, stage, date
 * AC-21.5.3: Auto-refresh when dates update
 * AC-21.5.4: Export to iCal
 * AC-21.5.5: Empty state
 * AC-21.5.6: Overdue visual indicator
 * AC-21.5.7: Unscheduled projects section
 */

import { format, parseISO } from "date-fns";
import { AlertCircle, Calendar, CalendarDays, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getAuthorProductionProjects } from "@/modules/production/queries";
import { WORKFLOW_STAGE_LABELS } from "@/modules/production/schema";
import type { AuthorProductionProject } from "@/modules/production/types";

interface AuthorPublicationScheduleProps {
  contactId: string;
  tenantId: string;
}

/**
 * Format date for display
 */
function formatDate(date: string | null): string {
  if (!date) return "—";
  return format(parseISO(date), "MMM d, yyyy");
}

/**
 * Group projects by month
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
 * Single Publication Entry
 */
function PublicationEntry({ project }: { project: AuthorProductionProject }) {
  return (
    <div
      className={cn(
        "border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
        project.isOverdue && "border-red-200 bg-red-50",
      )}
    >
      <div className="space-y-1">
        <h4 className="font-medium">{project.titleName}</h4>
        {project.isbn && (
          <p className="text-sm text-muted-foreground font-mono">
            ISBN: {project.isbn}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Badge
          variant={
            project.workflowStage === "complete" ? "default" : "secondary"
          }
        >
          {WORKFLOW_STAGE_LABELS[project.workflowStage]}
        </Badge>
        {project.isOverdue && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Overdue
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {formatDate(project.targetPublicationDate)}
        </span>
      </div>
    </div>
  );
}

/**
 * Unscheduled Entry (no target date)
 */
function UnscheduledEntry({ project }: { project: AuthorProductionProject }) {
  return (
    <div className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-dashed">
      <div className="space-y-1">
        <h4 className="font-medium text-muted-foreground">
          {project.titleName}
        </h4>
        {project.isbn && (
          <p className="text-sm text-muted-foreground font-mono">
            ISBN: {project.isbn}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline">
          {WORKFLOW_STAGE_LABELS[project.workflowStage]}
        </Badge>
        <span className="text-sm text-muted-foreground italic">
          No date set
        </span>
      </div>
    </div>
  );
}

export async function AuthorPublicationSchedule({
  contactId,
  tenantId,
}: AuthorPublicationScheduleProps) {
  const projects = await getAuthorProductionProjects(contactId, tenantId);

  // Split into scheduled vs unscheduled
  const scheduledProjects = projects.filter((p) => p.targetPublicationDate);
  const unscheduledProjects = projects.filter((p) => !p.targetPublicationDate);

  // AC-21.5.5: Empty state for no production projects
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Publication Schedule
          </CardTitle>
          <CardDescription>
            Plan your marketing around upcoming releases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No scheduled publications</p>
            <p className="text-xs mt-1">
              When your titles enter production with publication dates,
              they&apos;ll appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group scheduled projects by month
  const groupedByMonth = groupByMonth(scheduledProjects);
  const sortedMonths = sortMonthKeys(Object.keys(groupedByMonth));

  // Sort projects within each month by date
  for (const month of sortedMonths) {
    groupedByMonth[month].sort((a, b) => {
      // Safe: groupedByMonth only contains projects with targetPublicationDate
      const dateA = parseISO(a.targetPublicationDate as string);
      const dateB = parseISO(b.targetPublicationDate as string);
      return dateA.getTime() - dateB.getTime();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Publication Schedule
            </CardTitle>
            <CardDescription>
              Plan your marketing around upcoming releases
            </CardDescription>
          </div>
          {/* AC-21.5.4: Export to iCal - L3 Fix: Added aria-label */}
          {scheduledProjects.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <a
                href="/api/portal/schedule/ical"
                download
                aria-label="Export publication schedule to calendar"
              >
                <Download className="h-4 w-4 mr-2" />
                Export to Calendar
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scheduled projects grouped by month */}
        {sortedMonths.map((month) => (
          <div key={month} className="space-y-3">
            <h3 className="text-lg font-semibold text-muted-foreground">
              {month}
            </h3>
            {groupedByMonth[month].map((project) => (
              <PublicationEntry key={project.projectId} project={project} />
            ))}
          </div>
        ))}

        {/* AC-21.5.7: Unscheduled section */}
        {unscheduledProjects.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-lg font-semibold text-muted-foreground">
              Unscheduled
            </h3>
            <p className="text-sm text-muted-foreground">
              These titles are in production but don&apos;t have a publication
              date set yet.
            </p>
            {unscheduledProjects.map((project) => (
              <UnscheduledEntry key={project.projectId} project={project} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
