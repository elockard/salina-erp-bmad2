"use client";

/**
 * Step 1: Company Profile Setup
 * Story 20.1: Build Onboarding Wizard
 * AC 20.1.3: Company Profile Setup
 *
 * Reuses patterns from tenant-settings-form.tsx
 * Calls updateTenantSettings action on submit
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTenantSettings } from "@/modules/tenant/actions";
import { type CompanyProfileInput, companyProfileSchema } from "../schema";

const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "Europe/London", label: "UK (London)" },
  { value: "Europe/Paris", label: "Central Europe (Paris)" },
  { value: "Europe/Berlin", label: "Central Europe (Berlin)" },
];

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
];

interface StepCompanyProfileProps {
  /** Initial company name from tenant */
  companyName?: string;
  /** Callback when step is completed with company data for persistence */
  onComplete: (companyName: string) => void;
}

export function StepCompanyProfile({
  companyName = "",
  onComplete,
}: StepCompanyProfileProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CompanyProfileInput>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName,
      fiscalYearStart: null,
      currency: "USD",
      timezone: "America/New_York",
      statementFrequency: "quarterly",
    },
  });

  async function handleSubmit(data: CompanyProfileInput) {
    setIsSubmitting(true);
    try {
      // Call existing tenant settings action
      const result = await updateTenantSettings({
        timezone: data.timezone,
        fiscal_year_start: data.fiscalYearStart,
        default_currency: data.currency as "USD" | "EUR" | "GBP" | "CAD",
        statement_frequency: data.statementFrequency,
        // Keep existing royalty period settings
        royalty_period_type: "fiscal_year",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
      });

      if (result.success) {
        toast.success("Company profile saved");
        onComplete(data.companyName);
      } else {
        toast.error(result.error || "Failed to save company profile");
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
        <h2 className="text-xl font-semibold">Company Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your publishing company's basic settings. You can always
          update these later in Settings.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Company Name - Read only for now, from registration */}
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Your Publishing Company" />
                </FormControl>
                <FormDescription>
                  Your company name as it will appear on statements
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fiscal Year Start */}
          <FormField
            control={form.control}
            name="fiscalYearStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fiscal Year Start Date (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormDescription>
                  Your company's fiscal year start date (e.g., July 1 for
                  July-June fiscal year). Defaults to January 1 if not set.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Currency */}
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Timezone */}
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Used for displaying dates and scheduling statements
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Statement Frequency */}
          <FormField
            control={form.control}
            name="statementFrequency"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Statement Frequency</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="quarterly" id="quarterly" />
                      <Label htmlFor="quarterly" className="font-normal">
                        Quarterly (4x per year)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="annual" id="annual" />
                      <Label htmlFor="annual" className="font-normal">
                        Annual (1x per year)
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormDescription>
                  How often royalty statements are generated
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save & Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default StepCompanyProfile;
