"use client";

/**
 * Task List Component
 *
 * Displays production tasks with filtering and actions.
 *
 * Story: 18.2 - Assign Production Tasks to Vendors
 * AC-18.2.5: Task list with name, type, vendor, due date, status
 */

import { format, isBefore, parseISO, startOfDay } from "date-fns";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { deleteProductionTask, updateTaskStatus } from "../actions";
import { getProductionTasks } from "../queries";
import {
  getValidNextTaskStatuses,
  TASK_STATUS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  type TaskStatus,
} from "../schema";
import type { ProductionTaskWithVendor } from "../types";
import { TaskForm } from "./task-form";
import { TaskStatusBadge } from "./task-status-badge";

interface TaskListProps {
  projectId: string;
  projectStatus: string;
}

export function TaskList({ projectId, projectStatus }: TaskListProps) {
  const [tasks, setTasks] = useState<ProductionTaskWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] =
    useState<ProductionTaskWithVendor | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] =
    useState<ProductionTaskWithVendor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState<
    string | null
  >(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const filter =
        statusFilter !== "all" ? { status: statusFilter } : undefined;
      const data = await getProductionTasks(projectId, filter);
      setTasks(data);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setUpdatingStatusTaskId(taskId);
    try {
      const result = await updateTaskStatus(taskId, newStatus);
      if (result.success) {
        toast.success(`Status updated to ${TASK_STATUS_LABELS[newStatus]}`);
        loadTasks();
      } else {
        toast.error(result.message || "Failed to update status");
      }
    } catch (_error) {
      toast.error("An error occurred");
    } finally {
      setUpdatingStatusTaskId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmTask) return;

    setIsDeleting(true);
    try {
      const result = await deleteProductionTask(deleteConfirmTask.id);
      if (result.success) {
        toast.success("Task deleted");
        loadTasks();
      } else {
        toast.error(result.message || "Failed to delete task");
      }
    } catch (_error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmTask(null);
    }
  };

  const canAddTasks = projectStatus !== "cancelled";

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Tasks</CardTitle>
            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as TaskStatus | "all")
                }
              >
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(TASK_STATUS).map(([_key, value]) => (
                    <SelectItem key={value} value={value}>
                      {TASK_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Add Button */}
              {canAddTasks && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTask(null);
                    setIsFormOpen(true);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {statusFilter !== "all"
                ? "No tasks with this status"
                : "No tasks yet. Add a task to get started."}
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={() => {
                    setEditingTask(task);
                    setIsFormOpen(true);
                  }}
                  onDelete={() => setDeleteConfirmTask(task)}
                  onStatusChange={handleStatusChange}
                  isUpdatingStatus={updatingStatusTaskId === task.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Form */}
      <TaskForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingTask(null);
        }}
        projectId={projectId}
        task={editingTask || undefined}
        onSuccess={loadTasks}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmTask}
        onOpenChange={(open) => !open && setDeleteConfirmTask(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteConfirmTask?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Task Row Component
interface TaskRowProps {
  task: ProductionTaskWithVendor;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  isUpdatingStatus: boolean;
}

function TaskRow({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  isUpdatingStatus,
}: TaskRowProps) {
  const validNextStatuses = getValidNextTaskStatuses(task.status);
  // Use proper date comparison to handle timezone correctly
  // dueDate is YYYY-MM-DD string, compare against start of today in local timezone
  const isOverdue =
    task.dueDate &&
    isBefore(parseISO(task.dueDate), startOfDay(new Date())) &&
    task.status !== "completed" &&
    task.status !== "cancelled";

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{task.name}</span>
          <Badge variant="outline" className="text-xs">
            {TASK_TYPE_LABELS[task.taskType]}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {task.vendorName && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.vendorName}
            </span>
          )}
          {task.dueDate && (
            <span
              className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : ""}`}
            >
              <Calendar className="h-3 w-3" />
              {format(new Date(task.dueDate), "MMM d, yyyy")}
              {isOverdue && " (Overdue)"}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <TaskStatusBadge status={task.status} />

        {/* Status Change Dropdown */}
        {validNextStatuses.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                disabled={isUpdatingStatus}
                aria-label="Change task status"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {validNextStatuses.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => onStatusChange(task.id, status)}
                >
                  {TASK_STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Task actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
