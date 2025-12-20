"use client";

/**
 * Step 3: Add First Contact
 * Story 20.1: Build Onboarding Wizard
 * AC 20.1.5: Add First Contact (Optional)
 *
 * Reference: src/modules/contacts/components/contact-form.tsx
 * Simplified contact form for onboarding
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { assignContactRole, createContact } from "@/modules/contacts/actions";
import { type AddContactInput, addContactSchema } from "../schema";

const CONTACT_ROLES = [
  { value: "author", label: "Author", description: "Creates content" },
  { value: "customer", label: "Customer", description: "Purchases books" },
  { value: "vendor", label: "Vendor", description: "Provides services" },
];

interface StepAddContactProps {
  /** Callback when step is completed with contact ID */
  onComplete: (contactId: string, contactName: string) => void;
  /** Callback when step is skipped */
  onSkip: () => void;
}

export function StepAddContact({ onComplete, onSkip }: StepAddContactProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddContactInput>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      name: "",
      email: "",
      roles: ["author"],
    },
  });

  async function handleSubmit(data: AddContactInput) {
    setIsSubmitting(true);
    try {
      // Split name into first/last
      const nameParts = data.name.trim().split(" ");
      const firstName = nameParts[0] || data.name;
      const lastName = nameParts.slice(1).join(" ") || "";

      // Create contact using existing action
      const result = await createContact({
        first_name: firstName,
        last_name: lastName || firstName, // Use first name as last if not provided
        email: data.email || undefined,
        status: "active",
      });

      if (result.success) {
        // Assign roles
        for (const role of data.roles) {
          await assignContactRole(result.data.id, {
            role: role as "author" | "customer" | "vendor" | "distributor",
          });
        }

        toast.success(`Contact "${data.name}" created`);
        onComplete(result.data.id, data.name);
      } else {
        toast.error(
          "error" in result ? result.error : "Failed to create contact",
        );
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Add Your First Contact</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first author or contact. This helps you get started with
          managing your publishing relationships.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} />
                </FormControl>
                <FormDescription>
                  Full name of the author or contact
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="author@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Roles */}
          <FormField
            control={form.control}
            name="roles"
            render={() => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormDescription className="mb-2">
                  Select one or more roles for this contact
                </FormDescription>
                <div className="space-y-2">
                  {CONTACT_ROLES.map((role) => (
                    <FormField
                      key={role.value}
                      control={form.control}
                      name="roles"
                      render={({ field }) => (
                        <FormItem
                          key={role.value}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(role.value)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, role.value]);
                                } else {
                                  field.onChange(
                                    current.filter((v) => v !== role.value),
                                  );
                                }
                              }}
                            />
                          </FormControl>
                          <div className="space-y-0 leading-none">
                            <FormLabel className="font-normal cursor-pointer">
                              {role.label}
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              {role.description}
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

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Contact
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default StepAddContact;
