"use client";

/**
 * Board Project Card Component
 *
 * Draggable card for production board showing project details.
 * AC-18.3.1: Card displays title, ISBN, target date, days in stage
 * AC-18.3.6: Shows overdue indicator and task progress
 *
 * Story: 18.3 - Track Production Workflow Stages
 */

import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { AlertTriangle, Calendar, Clock, GripVertical } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import type { BoardProjectCard } from "../types";

interface BoardProjectCardComponentProps {
  card: BoardProjectCard;
  isDragging?: boolean;
}

export function BoardProjectCardComponent({
  card,
  isDragging,
}: BoardProjectCardComponentProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: card.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const progressPercent =
    card.taskStats.total > 0
      ? Math.round((card.taskStats.completed / card.taskStats.total) * 100)
      : 0;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-shadow",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
        card.isOverdue && "border-destructive/50",
      )}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start gap-2">
          <button
            className="mt-0.5 text-muted-foreground hover:text-foreground touch-none"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <Link
              href={`/production/${card.id}`}
              className="font-medium text-sm hover:underline line-clamp-2"
              onClick={(e) => e.stopPropagation()}
            >
              {card.titleName}
            </Link>
            {card.isbn13 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.isbn13}
              </p>
            )}
          </div>
          {card.isOverdue && (
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {/* Target date and days in stage */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {card.targetPublicationDate ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(card.targetPublicationDate), "MMM d, yyyy")}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground/60">No target date</span>
          )}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {card.daysInStage} {card.daysInStage === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        {/* Task progress */}
        {card.taskStats.total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tasks</span>
              <span>
                {card.taskStats.completed}/{card.taskStats.total}
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}

        {/* Status badges */}
        <div className="flex flex-wrap gap-1">
          {card.isOverdue && (
            <Badge variant="destructive" className="text-xs">
              Overdue
            </Badge>
          )}
          {card.daysInStage > 14 && !card.isOverdue && (
            <Badge variant="secondary" className="text-xs">
              Stalled
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
