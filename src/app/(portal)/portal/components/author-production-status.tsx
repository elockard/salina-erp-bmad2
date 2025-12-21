import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Factory,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getAuthorProductionProjects } from "@/modules/production/queries";
import {
  WORKFLOW_STAGE_LABELS,
  WORKFLOW_STAGES,
  type WorkflowStage,
  type WorkflowStageHistoryEntry,
} from "@/modules/production/schema";

/**
 * Author Production Status Component
 *
 * Displays production status for all titles where the author is listed.
 * Shows workflow stage progress, timeline, and estimated completion dates.
 *
 * Story: 21.1 - View Production Status in Author Portal
 * AC-21.1.1: Author sees production status for titles
 * AC-21.1.2: Visual workflow stage display
 * AC-21.1.3: Estimated completion date
 * AC-21.1.4: Stage transition timeline
 * AC-21.1.5: Overdue indicator
 * AC-21.1.6: Empty state for no production projects
 */

interface AuthorProductionStatusProps {
  authorId: string;
  tenantId: string;
}

/**
 * Get stage index for progress calculation
 */
function getStageIndex(stage: WorkflowStage): number {
  return WORKFLOW_STAGES.indexOf(stage);
}

/**
 * Format date for display
 * M2 Fix: Use parseISO to avoid timezone issues with date-only strings
 */
function formatDate(date: string | Date | null): string {
  if (!date) return "—";
  // If it's a string (YYYY-MM-DD format), use parseISO to avoid timezone shift
  if (typeof date === "string") {
    return format(parseISO(date), "MMM d, yyyy");
  }
  return format(date, "MMM d, yyyy");
}

/**
 * Stage Progress Indicator Component
 * AC-21.1.2: Visual workflow stage display with 6 stages
 */
function StageProgress({ currentStage }: { currentStage: WorkflowStage }) {
  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="flex items-center gap-1 w-full">
      {WORKFLOW_STAGES.map((stage, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={stage} className="flex-1 flex flex-col items-center gap-1">
            {/* Stage indicator */}
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                isComplete && "bg-green-500 text-white",
                isCurrent && "bg-blue-500 text-white",
                isPending && "bg-gray-200 text-gray-400",
              )}
            >
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </div>
            {/* Stage label - hidden on mobile, visible on larger screens */}
            <span
              className={cn(
                "text-xs text-center hidden sm:block",
                isComplete && "text-green-600",
                isCurrent && "text-blue-600 font-medium",
                isPending && "text-gray-400",
              )}
            >
              {WORKFLOW_STAGE_LABELS[stage]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Stage Timeline Component
 * AC-21.1.4: Stage transitions shown as visual milestones with dates
 */
function StageTimeline({
  stageHistory,
}: {
  stageHistory: WorkflowStageHistoryEntry[];
}) {
  if (stageHistory.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No stage transitions yet
      </p>
    );
  }

  // Sort by timestamp ascending (oldest first)
  const sortedHistory = [...stageHistory].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return (
    <div className="space-y-2">
      {sortedHistory.map((entry, index) => (
        <div
          key={`${entry.from}-${entry.to}-${index}`}
          className="flex items-center gap-2 text-sm"
        >
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-muted-foreground">
            {formatDate(entry.timestamp)}
          </span>
          <span className="text-gray-500">→</span>
          <Badge variant="secondary" className="text-xs">
            {WORKFLOW_STAGE_LABELS[entry.to]}
          </Badge>
        </div>
      ))}
    </div>
  );
}

/**
 * Single Production Project Card
 */
function ProductionProjectCard({
  project,
}: {
  project: {
    projectId: string;
    titleId: string;
    titleName: string;
    isbn: string | null;
    workflowStage: WorkflowStage;
    stageEnteredAt: Date | null;
    targetPublicationDate: string | null;
    isOverdue: boolean;
    stageHistory: WorkflowStageHistoryEntry[];
  };
}) {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* Title and Status Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h4 className="font-medium">{project.titleName}</h4>
          {project.isbn && (
            <p className="text-sm text-muted-foreground font-mono">
              ISBN: {project.isbn}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Stage Progress */}
      <StageProgress currentStage={project.workflowStage} />

      {/* Target Date and Timeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
        {/* Estimated Completion */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Estimated Completion
          </div>
          <p
            className={cn(
              "text-sm",
              project.isOverdue
                ? "text-red-600 font-medium"
                : "text-muted-foreground",
            )}
          >
            {formatDate(project.targetPublicationDate)}
          </p>
        </div>

        {/* Stage History */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Progress Timeline</p>
          <StageTimeline stageHistory={project.stageHistory} />
        </div>
      </div>
    </div>
  );
}

export async function AuthorProductionStatus({
  authorId,
  tenantId,
}: AuthorProductionStatusProps) {
  const projects = await getAuthorProductionProjects(authorId, tenantId);

  // AC-21.1.6: Empty state for no production projects
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Production Status
          </CardTitle>
          <CardDescription>
            Track the production progress of your titles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Factory className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No titles currently in production</p>
            <p className="text-xs mt-1">
              When your titles enter production, you&apos;ll see their progress
              here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const inProgressCount = projects.filter(
    (p) => p.workflowStage !== "complete",
  ).length;
  const completeCount = projects.filter(
    (p) => p.workflowStage === "complete",
  ).length;
  const overdueCount = projects.filter((p) => p.isOverdue).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Production Status
            </CardTitle>
            <CardDescription>
              Track the production progress of your titles
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{inProgressCount} in progress</span>
            <span>{completeCount} complete</span>
            {overdueCount > 0 && (
              <span className="text-red-600">{overdueCount} overdue</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.map((project) => (
          <ProductionProjectCard key={project.projectId} project={project} />
        ))}
      </CardContent>
    </Card>
  );
}
