"use client";

/**
 * Production Project Detail Component
 *
 * Displays full project details with actions.
 *
 * Story: 18.1 - Create Production Projects
 * AC-18.1.5: View detail with manuscript download, edit, status change
 */

import { format } from "date-fns";
import {
  ArrowRight,
  Calendar,
  Download,
  Edit,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

import { deleteProductionProject, updateProjectStatus } from "../actions";
import { formatFileSize } from "../queries";
import {
  getValidNextStatuses,
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
  type WorkflowStage,
} from "../schema";
import type { ProductionProjectWithTitle, TitleOption } from "../types";
import { ProductionProjectForm } from "./production-project-form";
import { ProofSection } from "./proof-section";
import { ProductionStatusBadge } from "./status-badge";
import { TaskList } from "./task-list";

interface ProductionProjectDetailProps {
  project: ProductionProjectWithTitle & { workflowStage?: WorkflowStage };
  availableTitles: TitleOption[];
  canDeleteProofs?: boolean;
  onUpdate: () => void;
  onDelete: () => void;
}

export function ProductionProjectDetail({
  project,
  availableTitles,
  canDeleteProofs = false,
  onUpdate,
  onDelete,
}: ProductionProjectDetailProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const validNextStatuses = getValidNextStatuses(project.status);

  const handleStatusChange = async (newStatus: ProductionStatus) => {
    setIsUpdatingStatus(true);
    try {
      const result = await updateProjectStatus(project.id, newStatus);
      if (result.success) {
        toast.success(
          `Status updated to ${PRODUCTION_STATUS_LABELS[newStatus]}`,
        );
        onUpdate();
      } else {
        toast.error(result.message || "Failed to update status");
      }
    } catch (_error) {
      toast.error("An error occurred");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProductionProject(project.id);
      if (result.success) {
        toast.success("Project deleted");
        onDelete();
      } else {
        toast.error(result.message || "Failed to delete project");
      }
    } catch (_error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  return (
    <>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{project.titleName}</h2>
            {project.isbn13 && (
              <p className="text-muted-foreground">{project.isbn13}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Status Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <ProductionStatusBadge status={project.status} />

              {validNextStatuses.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                      )}
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {validNextStatuses.map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleStatusChange(status)}
                      >
                        {PRODUCTION_STATUS_LABELS[status]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Details Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Target Date */}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Target Publication Date</p>
                <p className="text-sm text-muted-foreground">
                  {project.targetPublicationDate
                    ? format(
                        new Date(project.targetPublicationDate),
                        "MMMM d, yyyy",
                      )
                    : "Not set"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Manuscript */}
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Manuscript</p>
                {project.manuscriptFileName ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {project.manuscriptFileName}
                      {project.manuscriptFileSize && (
                        <span className="ml-1">
                          (
                          {formatFileSize(
                            parseInt(project.manuscriptFileSize, 10),
                          )}
                          )
                        </span>
                      )}
                    </span>
                    {project.manuscriptDownloadUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={project.manuscriptDownloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not uploaded</p>
                )}
              </div>
            </div>

            {/* Notes */}
            {project.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {project.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tasks Section - Story 18.2 */}
        <TaskList projectId={project.id} projectStatus={project.status} />

        {/* Proofs Section - Story 18.4 */}
        <ProofSection
          projectId={project.id}
          workflowStage={project.workflowStage}
          canDelete={canDeleteProofs}
        />

        {/* Timestamps */}
        <Card>
          <CardContent className="py-4">
            <div className="flex gap-6 text-xs text-muted-foreground">
              <span>
                Created: {format(project.createdAt, "MMM d, yyyy h:mm a")}
              </span>
              <span>
                Updated: {format(project.updatedAt, "MMM d, yyyy h:mm a")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <ProductionProjectForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        availableTitles={availableTitles}
        project={project}
        onSuccess={onUpdate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Production Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the production project for &quot;
              {project.titleName}&quot;? This action cannot be undone.
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
