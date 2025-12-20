"use client";

/**
 * Production Project Form Component
 *
 * Form for creating/editing production projects.
 * Uses FormData for file upload support.
 *
 * Story: 18.1 - Create Production Projects
 * AC-18.1.1: Select title, set target date, upload manuscript
 * AC-18.1.3: File upload (PDF/DOCX/DOC, max 50MB)
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, FileUp, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { createProductionProject, updateProductionProject } from "../actions";
import {
  type CreateProductionProjectInput,
  createProductionProjectSchema,
} from "../schema";
import { MANUSCRIPT_ALLOWED_EXTENSIONS, MANUSCRIPT_MAX_SIZE } from "../storage";
import type { ProductionProjectWithTitle, TitleOption } from "../types";

interface ProductionProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTitles: TitleOption[];
  project?: ProductionProjectWithTitle | null;
  onSuccess: () => void;
}

export function ProductionProjectForm({
  open,
  onOpenChange,
  availableTitles,
  project,
  onSuccess,
}: ProductionProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!project;

  const form = useForm<CreateProductionProjectInput>({
    resolver: zodResolver(createProductionProjectSchema),
    defaultValues: {
      titleId: project?.titleId ?? "",
      targetPublicationDate: project?.targetPublicationDate ?? "",
      notes: project?.notes ?? "",
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!MANUSCRIPT_ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error("Invalid file type. Allowed: PDF, DOCX, DOC");
      return;
    }

    // Validate file size
    if (file.size > MANUSCRIPT_MAX_SIZE) {
      toast.error("File too large. Maximum size is 50MB");
      return;
    }

    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: CreateProductionProjectInput) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("titleId", data.titleId);
      if (data.targetPublicationDate) {
        formData.append("targetPublicationDate", data.targetPublicationDate);
      }
      if (data.notes) {
        formData.append("notes", data.notes);
      }
      if (selectedFile) {
        formData.append("manuscript", selectedFile);
      }

      const result = isEditing
        ? await updateProductionProject(project.id, formData)
        : await createProductionProject(formData);

      if (result.success) {
        toast.success(
          isEditing
            ? "Project updated successfully"
            : "Project created successfully",
        );
        onOpenChange(false);
        onSuccess();
        form.reset();
        setSelectedFile(null);
      } else {
        toast.error(result.message || "Operation failed");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Include current project's title in options if editing
  const titleOptions = isEditing
    ? [
        {
          id: project.titleId,
          name: project.titleName,
          isbn13: project.isbn13,
        },
        ...availableTitles.filter((t) => t.id !== project.titleId),
      ]
    : availableTitles;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Edit Production Project"
              : "Create Production Project"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title Selection */}
            <FormField
              control={form.control}
              name="titleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a title" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {titleOptions.map((title) => (
                        <SelectItem key={title.id} value={title.id}>
                          {title.name}
                          {title.isbn13 && (
                            <span className="ml-2 text-muted-foreground">
                              ({title.isbn13})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Publication Date */}
            <FormField
              control={form.control}
              name="targetPublicationDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Target Publication Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) =>
                          field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Manuscript Upload */}
            <div className="space-y-2">
              <FormLabel>Manuscript</FormLabel>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {selectedFile ? "Change File" : "Upload Manuscript"}
                </Button>
              </div>

              {/* Selected file display */}
              {selectedFile && (
                <div className="flex items-center justify-between rounded-md border bg-muted/50 p-2">
                  <div className="flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Existing manuscript display */}
              {!selectedFile && project?.manuscriptFileName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileUp className="h-4 w-4" />
                  <span>Current: {project.manuscriptFileName}</span>
                </div>
              )}

              <FormDescription>
                PDF, DOCX, or DOC. Maximum 50MB.
              </FormDescription>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this production project..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
