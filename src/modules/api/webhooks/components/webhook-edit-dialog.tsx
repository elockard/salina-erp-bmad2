"use client";

/**
 * Webhook Edit Dialog
 * Story 15.4 - Edit existing webhook subscription
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { WEBHOOK_EVENT_TYPE_OPTIONS } from "@/db/schema/webhook-subscriptions";
import { updateWebhook, type WebhookSubscription } from "../actions";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  events: z.array(z.string()).min(1, "Select at least one event type"),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface WebhookEditDialogProps {
  webhook: WebhookSubscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebhookEditDialog({
  webhook,
  open,
  onOpenChange,
}: WebhookEditDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: webhook.name,
      description: webhook.description || "",
      url: "", // URL not shown for security, must re-enter to change
      events: webhook.events,
      is_active: webhook.is_active,
    },
  });

  // Reset form when webhook changes (e.g., editing different webhook)
  useEffect(() => {
    form.reset({
      name: webhook.name,
      description: webhook.description || "",
      url: "",
      events: webhook.events,
      is_active: webhook.is_active,
    });
  }, [
    webhook.name,
    webhook.description,
    webhook.events,
    webhook.is_active,
    form,
  ]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      // Only send URL if it was changed (non-empty)
      const data = {
        name: values.name,
        description: values.description,
        events: values.events,
        is_active: values.is_active,
        ...(values.url ? { url: values.url } : {}),
      };
      return updateWebhook(webhook.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook updated");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Webhook</DialogTitle>
          <DialogDescription>
            Update webhook configuration. Current endpoint: {webhook.url_domain}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Enable or disable this webhook
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Endpoint URL (leave blank to keep current)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`Current: ${webhook.url_domain}`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="events"
              render={() => (
                <FormItem>
                  <FormLabel>Event Types</FormLabel>
                  <div className="space-y-2 mt-2">
                    {WEBHOOK_EVENT_TYPE_OPTIONS.map((event) => (
                      <FormField
                        key={event.value}
                        control={form.control}
                        name="events"
                        render={({ field }) => (
                          <FormItem className="flex items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(event.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, event.value]);
                                  } else {
                                    field.onChange(
                                      current.filter((v) => v !== event.value),
                                    );
                                  }
                                }}
                              />
                            </FormControl>
                            <div className="space-y-0.5">
                              <Label className="font-medium">
                                {event.label}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {event.description}
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
