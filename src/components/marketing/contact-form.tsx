"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitContactForm } from "@/app/(public)/contact/actions";
import {
  contactFormSchema,
  type ContactFormData,
} from "@/app/(public)/contact/schema";

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    submitContactForm,
    null
  );

  const {
    register,
    formState: { errors },
    watch,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const messageLength = watch("message")?.length || 0;

  if (state?.success) {
    return (
      <div
        className="p-6 bg-green-50 border border-green-200 rounded-lg"
        role="status"
      >
        <p className="text-green-800 font-medium">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Honeypot field - hidden from users, catches bots */}
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register("name")}
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company (optional)</Label>
        <Input id="company" {...register("company")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">
          Message <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="message"
          rows={5}
          maxLength={1000}
          {...register("message")}
          aria-required="true"
          aria-invalid={!!errors.message}
          aria-describedby="message-hint message-error"
        />
        <div className="flex justify-between text-sm">
          <span id="message-hint" className="text-muted-foreground">
            {messageLength}/1000 characters
          </span>
          {errors.message && (
            <p id="message-error" className="text-destructive" role="alert">
              {errors.message.message}
            </p>
          )}
        </div>
      </div>

      {state && !state.success && (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
