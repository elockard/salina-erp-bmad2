"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { checkSubdomainAvailability, registerTenant } from "../actions";
import { type CreateTenantInput, createTenantSchema } from "../schema";

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function TenantRegistrationForm() {
  const router = useRouter();
  const [subdomainStatus, setSubdomainStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [subdomainMessage, setSubdomainMessage] = useState<string>("");

  const form = useForm<CreateTenantInput>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      companyName: "",
      subdomain: "",
      ownerEmail: "",
      ownerName: "",
      password: "",
    },
  });

  // Real-time subdomain availability check (debounced 500ms)
  const checkAvailability = useCallback(
    debounce(async (subdomain: string) => {
      if (!subdomain || subdomain.length < 3) {
        setSubdomainStatus("idle");
        setSubdomainMessage("");
        return;
      }

      setSubdomainStatus("checking");
      const result = await checkSubdomainAvailability(subdomain);

      if (result.success) {
        if (result.data.available) {
          setSubdomainStatus("available");
          setSubdomainMessage("✓ Subdomain is available");
        } else {
          setSubdomainStatus("taken");
          setSubdomainMessage(
            result.data.message || "This subdomain is already taken",
          );
        }
      } else {
        setSubdomainStatus("idle");
        setSubdomainMessage("");
      }
    }, 500),
    [],
  );

  // Watch subdomain field for live preview and availability check
  const subdomain = form.watch("subdomain");

  // Trigger availability check on subdomain change
  useState(() => {
    if (subdomain) {
      checkAvailability(subdomain);
    }
  });

  async function onSubmit(values: CreateTenantInput) {
    try {
      const result = await registerTenant(values);

      if (result.success) {
        toast.success("Welcome to Salina ERP! Your workspace is ready.");

        // Redirect to tenant subdomain /welcome page
        const protocol = window.location.protocol;
        const baseDomain =
          process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ||
          "salina-erp.com";
        const tenantUrl = `${protocol}//${result.data.subdomain}.${baseDomain}/welcome`;

        // Small delay to show toast
        setTimeout(() => {
          window.location.href = tenantUrl;
        }, 1000);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Registration error", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  }

  const characterCount = form.watch("companyName")?.length || 0;
  const ownerNameCount = form.watch("ownerName")?.length || 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Name */}
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Publishing"
                  {...field}
                  maxLength={100}
                  className="rounded-md"
                />
              </FormControl>
              <FormDescription>{characterCount}/100 characters</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Subdomain */}
        <FormField
          control={form.control}
          name="subdomain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subdomain</FormLabel>
              <FormControl>
                <Input
                  placeholder="acmepublishing"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase();
                    field.onChange(value);
                    checkAvailability(value);
                  }}
                  maxLength={30}
                  className="rounded-md"
                />
              </FormControl>
              <FormDescription>
                Your workspace URL:{" "}
                <span className="font-medium text-[#1E3A5F]">
                  {subdomain || "[subdomain]"}.salina-erp.com
                </span>
              </FormDescription>
              {subdomainStatus === "checking" && (
                <p className="text-sm text-slate-500">
                  Checking availability...
                </p>
              )}
              {subdomainStatus === "available" && (
                <p className="text-sm text-green-600">{subdomainMessage}</p>
              )}
              {subdomainStatus === "taken" && (
                <p className="text-sm text-red-600">{subdomainMessage}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Owner Email */}
        <FormField
          control={form.control}
          name="ownerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="owner@acmepublishing.com"
                  {...field}
                  className="rounded-md"
                />
              </FormControl>
              <FormDescription>
                This will be your login email address
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Owner Name */}
        <FormField
          control={form.control}
          name="ownerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John Smith"
                  {...field}
                  maxLength={100}
                  className="rounded-md"
                />
              </FormControl>
              <FormDescription>{ownerNameCount}/100 characters</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...field}
                  className="rounded-md"
                />
              </FormControl>
              <FormDescription>Minimum 8 characters</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || subdomainStatus === "taken"}
          className="w-full bg-[#1E3A5F] hover:bg-[#152d47] rounded-md"
        >
          {form.formState.isSubmitting
            ? "Creating Workspace..."
            : "Create Workspace"}
        </Button>
      </form>
    </Form>
  );
}
