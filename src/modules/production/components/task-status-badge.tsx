"use client";

/**
 * Task Status Badge Component
 *
 * Displays task status with color coding.
 *
 * Story: 18.2 - Assign Production Tasks to Vendors
 * AC-18.2.5: Visual status indicators
 */

import { Badge } from "@/components/ui/badge";
import { TASK_STATUS_LABELS, type TaskStatus } from "../schema";

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusVariants: Record<TaskStatus, string> = {
  pending: "bg-slate-100 text-slate-800 hover:bg-slate-100/80",
  "in-progress": "bg-blue-100 text-blue-800 hover:bg-blue-100/80",
  completed: "bg-green-100 text-green-800 hover:bg-green-100/80",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100/80",
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={statusVariants[status]}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}
