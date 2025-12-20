"use client";

/**
 * Notification Preferences Form
 *
 * Story 20.3 - FR178: Configure Notification Preferences
 *
 * Preference grid UI with toggle checkboxes for in-app and email.
 * AC 20.3.2: Preference grid display
 * AC 20.3.3: Toggle preferences
 * AC 20.3.4: Save preferences
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NOTIFICATION_TYPES } from "@/db/schema/notifications";
import { DEFAULT_PREFERENCES } from "../constants";
import {
  fetchUserPreferences,
  saveNotificationPreferences,
} from "../preferences/actions";

// Schema for form validation
const preferenceSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES as unknown as [string, ...string[]]),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
});

const formSchema = z.object({
  preferences: z.array(preferenceSchema),
});

type FormData = z.infer<typeof formSchema>;

/**
 * Convert DEFAULT_PREFERENCES to form data format
 */
function getDefaultFormData(): FormData {
  return {
    preferences: DEFAULT_PREFERENCES.map((pref) => ({
      type: pref.type,
      inAppEnabled: pref.defaultInApp,
      emailEnabled: pref.defaultEmail,
    })),
  };
}

export function NotificationPreferencesForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormData(),
  });

  const { isDirty } = form.formState;

  // Load user preferences on mount
  useEffect(() => {
    async function loadPreferences() {
      try {
        const result = await fetchUserPreferences();
        if (result.success && result.data) {
          // Update form with saved preferences
          form.reset({
            preferences: result.data.preferences.map((pref) => ({
              type: pref.type,
              inAppEnabled: pref.inAppEnabled,
              emailEnabled: pref.emailEnabled,
            })),
          });
        }
      } catch (error) {
        console.error("Failed to load preferences:", error);
        toast.error("Failed to load notification preferences");
      } finally {
        setIsLoading(false);
      }
    }
    loadPreferences();
  }, [form]);

  async function onSubmit(data: FormData) {
    setIsSaving(true);
    try {
      const result = await saveNotificationPreferences({
        preferences: data.preferences,
      });

      if (result.success) {
        // AC 20.3.4: Success toast
        toast.success("Notification preferences saved");
        // Reset form state to clear isDirty
        form.reset(data);
      } else {
        toast.error(result.error || "Failed to save preferences");
      }
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error("Failed to save notification preferences");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Unsaved changes indicator */}
        {isDirty && (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 border border-amber-200">
            You have unsaved changes
          </div>
        )}

        {/* Preference Grid Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Notification Type</TableHead>
                <TableHead className="text-center w-[100px]">In-App</TableHead>
                <TableHead className="text-center w-[100px]">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEFAULT_PREFERENCES.map((pref, index) => (
                <TableRow key={pref.type}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{pref.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {pref.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <FormField
                      control={form.control}
                      name={`preferences.${index}.inAppEnabled`}
                      render={({ field }) => (
                        <FormItem className="flex justify-center">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              aria-label={`${pref.label} in-app notifications`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <FormField
                      control={form.control}
                      name={`preferences.${index}.emailEnabled`}
                      render={({ field }) => (
                        <FormItem className="flex justify-center">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              aria-label={`${pref.label} email notifications`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!isDirty || isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
