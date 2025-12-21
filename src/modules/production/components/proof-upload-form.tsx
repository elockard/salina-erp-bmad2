"use client";

/**
 * Proof Upload Form Component
 *
 * Form for uploading proof files with drag-drop support.
 *
 * Story: 18.4 - Upload and Manage Proof Files
 * AC-18.4.1: Upload proof file (PDF only, max 100MB) with version auto-increment
 */

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { uploadProofFile } from "../actions";
import { PROOF_ALLOWED_TYPES, PROOF_MAX_SIZE } from "../storage";

interface ProofUploadFormProps {
  projectId: string;
  isProofStage?: boolean;
  onUploadSuccess: () => void;
}

export function ProofUploadForm({
  projectId,
  isProofStage = false,
  onUploadSuccess,
}: ProofUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate file before processing
   */
  const validateFile = useCallback((f: File): string | null => {
    // Check MIME type (PDF only)
    if (!PROOF_ALLOWED_TYPES.includes(f.type)) {
      return "Invalid file type. Only PDF files are allowed.";
    }

    // Check file size (max 100MB)
    if (f.size > PROOF_MAX_SIZE) {
      return `File too large. Maximum size is 100MB (${(
        f.size / 1024 / 1024
      ).toFixed(1)}MB uploaded).`;
    }

    return null;
  }, []);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      const error = validateFile(selectedFile);
      if (error) {
        toast.error(error);
        return;
      }
      setFile(selectedFile);
    },
    [validateFile],
  );

  /**
   * Handle file input change
   */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect],
  );

  /**
   * Handle drag and drop
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect],
  );

  /**
   * Clear selected file
   */
  const handleClearFile = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  /**
   * Submit proof file upload
   */
  const handleSubmit = useCallback(async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("proofFile", file);
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      const result = await uploadProofFile(formData);

      if (result.success) {
        toast.success(`Proof v${result.version} uploaded successfully`);
        setFile(null);
        setNotes("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onUploadSuccess();
      } else {
        toast.error(result.message || "Failed to upload proof");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsUploading(false);
    }
  }, [file, notes, projectId, onUploadSuccess]);

  return (
    <Card
      className={isProofStage ? "border-blue-300 bg-blue-50/30" : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Upload Proof</CardTitle>
          {isProofStage && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Proof Stage
            </span>
          )}
        </div>
        <CardDescription>
          Upload a proof PDF file. Version numbers are assigned automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        {!file ? (
          // biome-ignore lint/a11y/noStaticElementInteractions: drop zone with accessible file input
          // biome-ignore lint/a11y/useKeyWithClickEvents: accessible via nested input
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Drag and drop your proof PDF here, or
            </p>
            <span className="text-sm font-medium text-primary hover:underline">
              click to browse
            </span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground mt-3">
              PDF only, max 100MB
            </p>
          </div>
        ) : (
          /* Selected file display */
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-red-600" />
              <div>
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearFile}
              disabled={isUploading}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Notes field */}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="proof-notes">
            Version Notes (optional)
          </label>
          <Textarea
            id="proof-notes"
            placeholder="e.g., Initial layout, Fixed typos on page 42..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={2}
            className="resize-none"
            disabled={isUploading}
          />
        </div>

        {/* Upload button */}
        <Button
          onClick={handleSubmit}
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Proof
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
