"use client";

/**
 * Webhook Create Dialog
 * Story 15.4 - Create new webhook subscription
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { WEBHOOK_EVENT_TYPE_OPTIONS } from "@/db/schema/webhook-subscriptions";
import { createWebhook } from "../actions";
import { WebhookSecretDialog } from "./webhook-secret-dialog";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.string()).min(1, "Select at least one event type"),
});

type FormValues = z.infer<typeof formSchema>;

interface WebhookCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebhookCreateDialog({
  open,
  onOpenChange,
}: WebhookCreateDialogProps) {
  const queryClient = useQueryClient();
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      url: "",
      events: [],
    },
  });

  const mutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setNewSecret(result.secret);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open && !newSecret} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Configure an endpoint to receive event notifications.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Webhook" {...field} />
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
                    <FormLabel>Endpoint URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/webhook"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      HTTPS required (HTTP allowed for localhost only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What this webhook is used for..."
                        {...field}
                      />
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
                    <FormDescription>
                      Select events to subscribe to
                    </FormDescription>
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
                                        current.filter(
                                          (v) => v !== event.value,
                                        ),
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
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Creating..." : "Create Webhook"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {newSecret && (
        <WebhookSecretDialog
          secret={newSecret}
          open={!!newSecret}
          onOpenChange={(open) => {
            if (!open) {
              setNewSecret(null);
              onOpenChange(false);
            }
          }}
          isNew
        />
      )}
    </>
  );
}
