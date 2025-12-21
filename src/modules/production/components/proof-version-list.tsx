"use client";

/**
 * Proof Version List Component
 *
 * Displays version history of proof files with download, edit, delete actions.
 *
 * Story: 18.4 - Upload and Manage Proof Files
 * AC-18.4.2: Version history with version number, upload date, uploader, file size, notes
 * AC-18.4.3: Download with presigned URL and versioned filename
 * AC-18.4.5: Edit notes for a version
 * AC-18.4.6: Delete (soft delete, admin/owner only)
 */

import { format } from "date-fns";
import {
  Download,
  Edit,
  FileText,
  Loader2,
  MoreVertical,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

import { deleteProofFile, updateProofNotes } from "../actions";
import { formatFileSize } from "../queries";
import type { ProofFileWithUrl } from "../types";

interface ProofVersionListProps {
  proofs: ProofFileWithUrl[];
  canDelete?: boolean;
  onRefresh: () => void;
}

export function ProofVersionList({
  proofs,
  canDelete = false,
  onRefresh,
}: ProofVersionListProps) {
  const [editingProof, setEditingProof] = useState<ProofFileWithUrl | null>(
    null,
  );
  const [editNotes, setEditNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const [deletingProof, setDeletingProof] = useState<ProofFileWithUrl | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handle edit notes dialog open
   */
  const handleEditClick = (proof: ProofFileWithUrl) => {
    setEditingProof(proof);
    setEditNotes(proof.notes || "");
  };

  /**
   * Save edited notes
   */
  const handleSaveNotes = async () => {
    if (!editingProof) return;

    setIsSavingNotes(true);
    try {
      const result = await updateProofNotes(
        editingProof.id,
        editNotes.trim() || null,
      );

      if (result.success) {
        toast.success("Notes updated");
        setEditingProof(null);
        onRefresh();
      } else {
        toast.error(result.message || "Failed to update notes");
      }
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSavingNotes(false);
    }
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteClick = (proof: ProofFileWithUrl) => {
    setDeletingProof(proof);
  };

  /**
   * Delete proof file (soft delete)
   */
  const handleConfirmDelete = async () => {
    if (!deletingProof) return;

    setIsDeleting(true);
    try {
      const result = await deleteProofFile(deletingProof.id);

      if (result.success) {
        toast.success(`Proof v${deletingProof.version} deleted`);
        setDeletingProof(null);
        onRefresh();
      } else {
        toast.error(result.message || "Failed to delete proof");
      }
    } catch (error) {
      console.error("Error deleting proof:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  if (proofs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 opacity-50 mb-3" />
        <p className="text-sm">No proof files uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {proofs.map((proof, index) => (
          <div
            key={proof.id}
            className={`
              flex items-start justify-between p-3 rounded-lg border
              ${index === 0 ? "bg-blue-50/50 border-blue-200" : "bg-muted/30"}
            `}
          >
            <div className="flex items-start gap-3">
              <FileText
                className={`h-8 w-8 mt-0.5 ${
                  index === 0 ? "text-blue-600" : "text-red-600"
                }`}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={index === 0 ? "default" : "secondary"}>
                    v{proof.version}
                  </Badge>
                  {index === 0 && (
                    <span className="text-xs text-blue-600 font-medium">
                      Latest
                    </span>
                  )}
                </div>
                <p className="text-sm">
                  <span className="font-medium">{proof.fileName}</span>
                  <span className="text-muted-foreground ml-1">
                    ({formatFileSize(parseInt(proof.fileSize, 10))})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {format(proof.uploadedAt, "MMM d, yyyy h:mm a")} by{" "}
                  {proof.uploaderName}
                </p>
                {proof.notes && (
                  <p className="text-sm text-muted-foreground italic mt-1">
                    &ldquo;{proof.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Download button */}
              <Button variant="ghost" size="icon" asChild>
                <a
                  href={proof.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Download v${proof.version}`}
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditClick(proof)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Notes
                  </DropdownMenuItem>
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(proof)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Notes Dialog */}
      <Dialog
        open={!!editingProof}
        onOpenChange={(open) => !open && setEditingProof(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Proof Notes</DialogTitle>
            <DialogDescription>
              Update the notes for version {editingProof?.version}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="e.g., Initial layout, Fixed typos on page 42..."
            maxLength={2000}
            rows={3}
            className="resize-none"
            disabled={isSavingNotes}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingProof(null)}
              disabled={isSavingNotes}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} disabled={isSavingNotes}>
              {isSavingNotes && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingProof}
        onOpenChange={(open) => !open && setDeletingProof(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proof File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete proof version{" "}
              {deletingProof?.version}? The file will be removed from the list
              but retained in storage for compliance purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
