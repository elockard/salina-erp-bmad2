"use client";

/**
 * Ingram Feed Schedule Component
 *
 * Story 16.2 - AC1: Feed Schedule Configuration
 * Allows publishers to configure automated ONIX feed delivery schedules.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveIngramSchedule, triggerIngramFeed } from "../actions";
import type { IngramSchedule } from "../types";

const scheduleSchema = z.object({
  frequency: z.enum(["disabled", "daily", "weekly"]),
  hour: z.number().min(0).max(23),
  dayOfWeek: z.number().min(0).max(6).optional(),
  feedType: z.enum(["full", "delta"]),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface IngramFeedScheduleProps {
  currentSchedule: IngramSchedule | null;
  isConnected: boolean;
}

export function IngramFeedSchedule({
  currentSchedule,
  isConnected,
}: IngramFeedScheduleProps) {
  const [isPending, startTransition] = useTransition();
  const [isTriggeringManual, setIsTriggeringManual] = useState(false);

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: currentSchedule || {
      frequency: "disabled",
      hour: 6,
      feedType: "delta",
    },
  });

  const frequency = form.watch("frequency");

  async function handleSubmit(data: ScheduleFormData) {
    startTransition(async () => {
      const result = await saveIngramSchedule(data);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  async function handleManualTrigger() {
    setIsTriggeringManual(true);
    try {
      const result = await triggerIngramFeed();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsTriggeringManual(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feed Schedule</CardTitle>
        <CardDescription>
          Configure automatic ONIX feed delivery to Ingram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected ? (
          <p className="text-muted-foreground">
            Connect your Ingram account to configure feed scheduling.
          </p>
        ) : (
          <>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="disabled">Disabled</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {frequency !== "disabled" && (
                  <>
                    <FormField
                      control={form.control}
                      name="hour"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time (UTC)</FormLabel>
                          <Select
                            onValueChange={(v) =>
                              field.onChange(parseInt(v, 10))
                            }
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[
                                0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
                                14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
                              ].map((hour) => (
                                <SelectItem
                                  key={`hour-${hour}`}
                                  value={hour.toString()}
                                >
                                  {hour.toString().padStart(2, "0")}:00 UTC
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose when feeds are sent (times shown in UTC)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {frequency === "weekly" && (
                      <FormField
                        control={form.control}
                        name="dayOfWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day of Week</FormLabel>
                            <Select
                              onValueChange={(v) =>
                                field.onChange(parseInt(v, 10))
                              }
                              defaultValue={(field.value ?? 1).toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">Sunday</SelectItem>
                                <SelectItem value="1">Monday</SelectItem>
                                <SelectItem value="2">Tuesday</SelectItem>
                                <SelectItem value="3">Wednesday</SelectItem>
                                <SelectItem value="4">Thursday</SelectItem>
                                <SelectItem value="5">Friday</SelectItem>
                                <SelectItem value="6">Saturday</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="feedType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feed Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="delta">
                                Changed titles only
                              </SelectItem>
                              <SelectItem value="full">All titles</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Delta feeds include only titles changed since the
                            last feed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Schedule"}
                </Button>
              </form>
            </Form>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Manual Feed</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Generate and send an ONIX feed to Ingram immediately.
              </p>
              <Button
                variant="outline"
                onClick={handleManualTrigger}
                disabled={isTriggeringManual}
              >
                {isTriggeringManual ? "Sending..." : "Send Feed Now"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
