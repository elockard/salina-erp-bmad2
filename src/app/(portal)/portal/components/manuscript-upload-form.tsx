"use client";

/**
 * Manuscript Upload Form Component
 *
 * Form for authors to upload manuscript files with drag-drop support.
 * Supports title selection from author's existing titles or new title submission.
 *
 * Story: 21.3 - Upload Manuscript Files
 * AC-21.3.1: Upload interface accepts Word/PDF
 * AC-21.3.2: Upload progress indicator
 * AC-21.3.3: Associate manuscript with title
 */

import { File, FileText, Loader2, Upload, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  type AuthorTitleOption,
  MANUSCRIPT_ALLOWED_TYPES,
  MANUSCRIPT_MAX_SIZE,
  uploadManuscriptSubmission,
} from "@/modules/manuscripts";

interface ManuscriptUploadFormProps {
  /** Author's titles for dropdown selection */
  titles: AuthorTitleOption[];
  /** Callback when upload succeeds */
  onUploadSuccess?: () => void;
}

/** File type icons by content type */
const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
  "application/pdf": FileText,
  "application/msword": File,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    File,
};

export function ManuscriptUploadForm({
  titles,
  onUploadSuccess,
}: ManuscriptUploadFormProps) {
  const [file, setFile] = useState<globalThis.File | null>(null);
  const [titleId, setTitleId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate file before processing
   */
  const validateFile = useCallback((f: globalThis.File): string | null => {
    // Check MIME type
    if (!MANUSCRIPT_ALLOWED_TYPES.includes(f.type)) {
      return "Invalid file type. Allowed: PDF, Word (.doc, .docx)";
    }

    // Check file size (max 50MB)
    if (f.size > MANUSCRIPT_MAX_SIZE) {
      return `File too large. Maximum size is 50MB (${(
        f.size / 1024 / 1024
      ).toFixed(1)}MB selected).`;
    }

    return null;
  }, []);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    (selectedFile: globalThis.File) => {
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
   * Submit manuscript upload
   */
  const handleSubmit = useCallback(async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!titleId) {
      toast.error("Please select a title or choose 'New Title Submission'");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("titleId", titleId);
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      const result = await uploadManuscriptSubmission(formData);

      if (result.success) {
        toast.success("Manuscript submitted successfully");
        setFile(null);
        setTitleId("");
        setNotes("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onUploadSuccess?.();
      } else {
        toast.error(result.error || "Failed to upload manuscript");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsUploading(false);
    }
  }, [file, titleId, notes, onUploadSuccess]);

  // Get file icon based on content type
  const FileIcon = file ? FILE_TYPE_ICONS[file.type] || FileText : FileText;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Submit Manuscript</CardTitle>
        <CardDescription>
          Upload your manuscript file (PDF or Word document) and associate it
          with a title.
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
              Drag and drop your manuscript here, or
            </p>
            <span className="text-sm font-medium text-primary hover:underline">
              click to browse
            </span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground mt-3">
              PDF or Word document, max 50MB
            </p>
          </div>
        ) : (
          /* Selected file display */
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <FileIcon
                className={`h-8 w-8 ${
                  file.type === "application/pdf"
                    ? "text-red-600"
                    : "text-blue-600"
                }`}
              />
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

        {/* Title selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="title-select">
            Associated Title
          </label>
          <Select
            value={titleId}
            onValueChange={setTitleId}
            disabled={isUploading}
          >
            <SelectTrigger id="title-select">
              <SelectValue placeholder="Select a title..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">
                <span className="font-medium">New Title Submission</span>
                <span className="text-muted-foreground text-xs ml-2">
                  (Title not in system yet)
                </span>
              </SelectItem>
              {titles.map((title) => (
                <SelectItem key={title.id} value={title.id}>
                  <span>{title.title}</span>
                  {title.isbn && (
                    <span className="text-muted-foreground text-xs ml-2">
                      ({title.isbn})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose an existing title or select &quot;New Title Submission&quot;
            for unpublished work.
          </p>
        </div>

        {/* Notes field */}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="manuscript-notes">
            Notes for Editor (optional)
          </label>
          <Textarea
            id="manuscript-notes"
            placeholder="e.g., This is a revised version, please see chapter 5 changes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={3}
            className="resize-none"
            disabled={isUploading}
          />
        </div>

        {/* Upload button */}
        <Button
          onClick={handleSubmit}
          disabled={!file || !titleId || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Submit Manuscript
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
