"use client";

/**
 * Announcement Form Component
 *
 * Story 13.8: Implement Platform-Wide Announcements
 * AC: 1 - Create announcements with message, type, dates, target roles
 * AC: 6 - Edit existing announcements
 *
 * Features:
 * - Message textarea with live markdown preview
 * - Type selection (info, warning, critical)
 * - Start/End datetime pickers
 * - Target roles multi-select
 * - Zod validation
 * - Create and update modes
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { ActionResult } from "@/lib/types";

import { createAnnouncement, updateAnnouncement } from "../actions";
import type { PlatformAnnouncement } from "../types";

const announcementSchema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters"),
  type: z.enum(["info", "warning", "critical"]),
  startsAt: z.string().min(1, "Start date is required"),
  hasEndDate: z.boolean(),
  endsAt: z.string().optional(),
  targetRoles: z.array(z.string()),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

const AVAILABLE_ROLES = [
  { id: "owner", label: "Owner" },
  { id: "admin", label: "Admin" },
  { id: "editor", label: "Editor" },
  { id: "finance", label: "Finance" },
  { id: "author", label: "Author (Portal)" },
];

interface AnnouncementFormProps {
  announcement?: PlatformAnnouncement;
  mode: "create" | "edit";
}

export function AnnouncementForm({
  announcement,
  mode,
}: AnnouncementFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [previewMode, setPreviewMode] = useState(false);

  // Format dates for datetime-local input
  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date) return "";
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      message: announcement?.message || "",
      type: announcement?.type || "info",
      startsAt:
        formatDateForInput(announcement?.startsAt) ||
        formatDateForInput(new Date()),
      hasEndDate: !!announcement?.endsAt,
      endsAt: formatDateForInput(announcement?.endsAt) || "",
      targetRoles: announcement?.targetRoles || [],
    },
  });

  const hasEndDate = form.watch("hasEndDate");
  const messageValue = form.watch("message");

  const onSubmit = async (data: AnnouncementFormData) => {
    startTransition(async () => {
      const startsAt = new Date(data.startsAt);
      const endsAt =
        data.hasEndDate && data.endsAt ? new Date(data.endsAt) : null;

      // Validate end date is after start date
      if (endsAt && endsAt <= startsAt) {
        toast.error("End date must be after start date");
        return;
      }

      const input = {
        message: data.message,
        type: data.type,
        startsAt,
        endsAt,
        targetRoles: data.targetRoles.length > 0 ? data.targetRoles : null,
      };

      let result: ActionResult<PlatformAnnouncement>;
      if (mode === "create") {
        result = await createAnnouncement(input);
      } else {
        result = await updateAnnouncement(announcement?.id ?? "", input);
      }

      if (result.success) {
        toast.success(
          mode === "create"
            ? "Announcement created successfully"
            : "Announcement updated successfully",
        );
        router.push("/platform-admin/announcements");
      } else {
        toast.error(result.error || "Failed to save announcement");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Message Field with Preview Toggle */}
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Message</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Preview</span>
                <Switch
                  checked={previewMode}
                  onCheckedChange={setPreviewMode}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  {previewMode ? (
                    <div className="min-h-[120px] rounded-md border border-slate-600 bg-slate-900 p-3 text-slate-200">
                      {messageValue || (
                        <span className="text-slate-500">
                          Enter a message to see preview...
                        </span>
                      )}
                    </div>
                  ) : (
                    <FormControl>
                      <Textarea
                        placeholder="Enter announcement message (supports basic markdown: **bold**, *italic*, [links](url))"
                        className="min-h-[120px] border-slate-600 bg-slate-900 text-slate-200"
                        {...field}
                      />
                    </FormControl>
                  )}
                  <FormDescription className="text-slate-500">
                    Supports basic markdown formatting. Minimum 10 characters.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Type and Dates */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Type Selection */}
          <Card className="border-slate-700 bg-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Type</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border-slate-600 bg-slate-900 text-slate-200">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="info">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            Info - General information (dismissible)
                          </span>
                        </SelectItem>
                        <SelectItem value="warning">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Warning - Requires attention (dismissible)
                          </span>
                        </SelectItem>
                        <SelectItem value="critical">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Critical - Urgent notice (NOT dismissible)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-slate-500">
                      Critical announcements cannot be dismissed by users.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card className="border-slate-700 bg-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        className="border-slate-600 bg-slate-900 text-slate-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hasEndDate"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 text-slate-300">
                      Set end date
                    </FormLabel>
                  </FormItem>
                )}
              />

              {hasEndDate && (
                <FormField
                  control={form.control}
                  name="endsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">End Date</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="border-slate-600 bg-slate-900 text-slate-200"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Target Roles */}
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">
              Target Audience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="targetRoles"
              render={() => (
                <FormItem>
                  <div className="mb-3">
                    <FormDescription className="text-slate-500">
                      Leave all unchecked to show to all users, or select
                      specific roles.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                    {AVAILABLE_ROLES.map((role) => (
                      <FormField
                        key={role.id}
                        control={form.control}
                        name="targetRoles"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={role.id}
                              className="flex items-center gap-2"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(role.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([
                                          ...field.value,
                                          role.id,
                                        ])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== role.id,
                                          ),
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="!mt-0 text-slate-300">
                                {role.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/platform-admin/announcements")}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create Announcement"
                : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
