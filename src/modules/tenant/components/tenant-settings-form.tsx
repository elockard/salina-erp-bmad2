"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
import { getTenantSettings, updateTenantSettings } from "../actions";
import {
  type UpdateTenantSettingsFormInput,
  updateTenantSettingsFormSchema,
} from "../schema";

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

export function TenantSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [originalValues, setOriginalValues] =
    useState<UpdateTenantSettingsFormInput | null>(null);

  const form = useForm<UpdateTenantSettingsFormInput>({
    resolver: zodResolver(updateTenantSettingsFormSchema),
    defaultValues: {
      timezone: "America/New_York",
      fiscal_year_start: null,
      default_currency: "USD",
      statement_frequency: "quarterly",
    },
  });

  // Load current settings on mount
  useEffect(() => {
    async function loadSettings() {
      const result = await getTenantSettings();
      if (result.success) {
        const settings: UpdateTenantSettingsFormInput = {
          timezone: result.data.timezone,
          fiscal_year_start: result.data.fiscal_year_start || null,
          default_currency: result.data.default_currency as
            | "USD"
            | "EUR"
            | "GBP"
            | "CAD",
          statement_frequency: result.data.statement_frequency as
            | "quarterly"
            | "annual",
        };
        form.reset(settings);
        setOriginalValues(settings);
      } else {
        toast.error(result.error);
      }
      setLoading(false);
    }
    loadSettings();
  }, [form]);

  async function onSubmit(data: UpdateTenantSettingsFormInput) {
    const result = await updateTenantSettings(data);

    if (result.success) {
      toast.success("Settings saved successfully");
      // Update original values after successful save
      const newValues: UpdateTenantSettingsFormInput = {
        timezone: result.data.timezone,
        fiscal_year_start: result.data.fiscal_year_start || null,
        default_currency: result.data.default_currency as
          | "USD"
          | "EUR"
          | "GBP"
          | "CAD",
        statement_frequency: result.data.statement_frequency as
          | "quarterly"
          | "annual",
      };
      setOriginalValues(newValues);
      form.reset(newValues);
    } else {
      toast.error(result.error || "Failed to save settings");
    }
  }

  function handleCancel() {
    if (originalValues) {
      form.reset(originalValues);
    }
  }

  const isDirty = form.formState.isDirty;
  const isValid = form.formState.isValid;
  const isSubmitting = form.formState.isSubmitting;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <p className="text-muted-foreground">
          Configure your publishing company's operational settings. These
          settings affect how dates are displayed, when financial periods
          start, and how royalty statements are generated.
        </p>

        {/* Timezone Field */}
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
                Used for displaying dates/times and scheduling royalty
                statements
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fiscal Year Start Field */}
        <FormField
          control={form.control}
          name="fiscal_year_start"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fiscal Year Start Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value || ""}
                  onChange={(e) => {
                    field.onChange(e.target.value || null);
                  }}
                />
              </FormControl>
              <FormDescription>
                Your company's fiscal year start date for financial reporting
                (e.g., July 1 for July-June fiscal year)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Default Currency Field */}
        <FormField
          control={form.control}
          name="default_currency"
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
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Default currency for displaying financial data. Multi-currency
                support coming soon.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Statement Frequency Field */}
        <FormField
          control={form.control}
          name="statement_frequency"
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
                How often royalty statements are generated (Quarterly = 4x/year,
                Annual = 1x/year)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={!isDirty || isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!isDirty || !isValid || isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
