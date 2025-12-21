"use client";

/**
 * Task Form Component
 *
 * Dialog form for creating and editing production tasks.
 *
 * Story: 18.2 - Assign Production Tasks to Vendors
 * AC-18.2.1: Create task with type, name, optional vendor, optional due date
 * AC-18.2.6: Edit name, type, vendor, due date, notes
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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

import { createProductionTask, updateProductionTask } from "../actions";
import { getVendorOptions } from "../queries";
import { TASK_TYPE_LABELS, TASK_TYPES } from "../schema";
import type { ProductionTaskWithVendor, VendorOption } from "../types";

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task?: ProductionTaskWithVendor;
  onSuccess: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z.string().max(2000).optional(),
  taskType: z.enum(TASK_TYPES),
  vendorId: z.string().optional(),
  dueDate: z.date().optional(),
  notes: z.string().max(5000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TaskForm({
  open,
  onOpenChange,
  projectId,
  task,
  onSuccess,
}: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const isEditing = !!task;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: task?.name || "",
      description: task?.description || "",
      taskType: task?.taskType || "editing",
      vendorId: task?.vendorId || undefined,
      dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
      notes: task?.notes || "",
    },
  });

  // Load vendors when dialog opens
  useEffect(() => {
    let cancelled = false;

    if (open) {
      setLoadingVendors(true);
      getVendorOptions()
        .then((data) => {
          if (!cancelled) setVendors(data);
        })
        .catch((err) => {
          if (!cancelled) console.error(err);
        })
        .finally(() => {
          if (!cancelled) setLoadingVendors(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset form when task changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: task?.name || "",
        description: task?.description || "",
        taskType: task?.taskType || "editing",
        vendorId: task?.vendorId || undefined,
        dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
        notes: task?.notes || "",
      });
    }
  }, [open, task, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", values.name);
      if (values.description)
        formData.append("description", values.description);
      formData.append("taskType", values.taskType);
      if (values.vendorId) formData.append("vendorId", values.vendorId);
      if (values.dueDate) {
        formData.append("dueDate", format(values.dueDate, "yyyy-MM-dd"));
      }
      if (values.notes) formData.append("notes", values.notes);

      let result: { success: boolean; message?: string; emailSent?: boolean };
      if (isEditing) {
        result = await updateProductionTask(task.id, formData);
      } else {
        formData.append("projectId", projectId);
        result = await createProductionTask(formData);
      }

      if (result.success) {
        toast.success(isEditing ? "Task updated" : "Task created");
        // Show warning if vendor was assigned but email failed
        if (result.emailSent === false) {
          toast.warning("Vendor notification email could not be sent");
        }
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.message || "Failed to save task");
      }
    } catch (_error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Add Task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update task details"
              : "Create a new task for this project"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Task Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Copy Editing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Task Type */}
            <FormField
              control={form.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {TASK_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vendor */}
            <FormField
              control={form.control}
              name="vendorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to Vendor</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "__none__" ? undefined : value)
                    }
                    value={field.value || "__none__"}
                    disabled={loadingVendors}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingVendors ? "Loading..." : "Select vendor"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No vendor</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                          {vendor.email && (
                            <span className="text-muted-foreground">
                              {" "}
                              ({vendor.email})
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

            {/* Due Date */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
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
                          {field.value
                            ? format(field.value, "PPP")
                            : "Pick a date"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Task description..."
                      className="resize-none"
                      rows={2}
                      maxLength={2000}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      className="resize-none"
                      rows={2}
                      maxLength={5000}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
