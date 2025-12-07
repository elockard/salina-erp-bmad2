"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import type { RoyaltyPeriodType } from "../types";

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

// Months for royalty period configuration (Story 7.5)
const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

// Days in each month (Feb uses 29 for leap year support)
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function getDaysInMonth(month: number): number {
  return DAYS_IN_MONTH[month - 1] || 31;
}

function formatRoyaltyPeriodPreview(
  type: RoyaltyPeriodType,
  startMonth: number | null,
  startDay: number | null,
  fiscalYearStart: string | null
): string {
  const year = new Date().getFullYear();

  switch (type) {
    case "calendar_year":
      return `Your royalty year runs from January 1, ${year} to December 31, ${year}`;

    case "fiscal_year":
      if (!fiscalYearStart) {
        return "Your royalty year follows fiscal year (configure fiscal year start date above)";
      }
      const fiscalDate = new Date(fiscalYearStart);
      const fiscalMonth = fiscalDate.getMonth();
      const fiscalDay = fiscalDate.getDate();
      const startDate = new Date(year, fiscalMonth, fiscalDay);
      const endDate = new Date(year + 1, fiscalMonth, fiscalDay - 1);
      return `Your royalty year runs from ${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} to ${endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

    case "custom":
      if (startMonth && startDay) {
        const customStart = new Date(year, startMonth - 1, startDay);
        const customEnd = new Date(year + 1, startMonth - 1, startDay - 1);
        return `Your royalty year runs from ${customStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} to ${customEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
      }
      return "Select start month and day to see period preview";
  }
}

export function TenantSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [originalValues, setOriginalValues] =
    useState<UpdateTenantSettingsFormInput | null>(null);
  const [showPeriodChangeWarning, setShowPeriodChangeWarning] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] =
    useState<UpdateTenantSettingsFormInput | null>(null);

  const form = useForm<UpdateTenantSettingsFormInput>({
    resolver: zodResolver(updateTenantSettingsFormSchema),
    defaultValues: {
      timezone: "America/New_York",
      fiscal_year_start: null,
      default_currency: "USD",
      statement_frequency: "quarterly",
      royalty_period_type: "fiscal_year",
      royalty_period_start_month: null,
      royalty_period_start_day: null,
    },
  });

  // Watch royalty period fields for conditional rendering and preview
  const royaltyPeriodType = useWatch({
    control: form.control,
    name: "royalty_period_type",
  });
  const royaltyPeriodStartMonth = useWatch({
    control: form.control,
    name: "royalty_period_start_month",
  });
  const royaltyPeriodStartDay = useWatch({
    control: form.control,
    name: "royalty_period_start_day",
  });
  const fiscalYearStart = useWatch({
    control: form.control,
    name: "fiscal_year_start",
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
          royalty_period_type: result.data.royalty_period_type,
          royalty_period_start_month: result.data.royalty_period_start_month,
          royalty_period_start_day: result.data.royalty_period_start_day,
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

  // Check if royalty period settings changed
  function hasRoyaltyPeriodChanged(
    data: UpdateTenantSettingsFormInput
  ): boolean {
    if (!originalValues) return false;
    return (
      data.royalty_period_type !== originalValues.royalty_period_type ||
      data.royalty_period_start_month !==
        originalValues.royalty_period_start_month ||
      data.royalty_period_start_day !== originalValues.royalty_period_start_day
    );
  }

  async function handleFormSubmit(data: UpdateTenantSettingsFormInput) {
    // AC-8: Show warning if royalty period settings changed
    if (hasRoyaltyPeriodChanged(data)) {
      setPendingSubmitData(data);
      setShowPeriodChangeWarning(true);
      return;
    }
    await performSubmit(data);
  }

  async function performSubmit(data: UpdateTenantSettingsFormInput) {
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
        royalty_period_type: result.data.royalty_period_type,
        royalty_period_start_month: result.data.royalty_period_start_month,
        royalty_period_start_day: result.data.royalty_period_start_day,
      };
      setOriginalValues(newValues);
      form.reset(newValues);
    } else {
      toast.error(result.error || "Failed to save settings");
    }
  }

  async function handleConfirmPeriodChange() {
    setShowPeriodChangeWarning(false);
    if (pendingSubmitData) {
      await performSubmit(pendingSubmitData);
      setPendingSubmitData(null);
    }
  }

  function handleCancelPeriodChange() {
    setShowPeriodChangeWarning(false);
    setPendingSubmitData(null);
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
    <>
      {/* AC-8: Mid-period change warning dialog */}
      <AlertDialog
        open={showPeriodChangeWarning}
        onOpenChange={setShowPeriodChangeWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Royalty Period Settings?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing period settings may affect in-progress calculations. Are
              you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelPeriodChange}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPeriodChange}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-8"
        >
        <p className="text-muted-foreground">
          Configure your publishing company's operational settings. These
          settings affect how dates are displayed, when financial periods start,
          and how royalty statements are generated.
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

        {/* Royalty Period Settings Section (Story 7.5) */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-lg font-medium">Royalty Period Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure when your royalty calculation periods begin and end,
            independent of your fiscal year.
          </p>

          {/* Period Type Selection - AC-2 */}
          <FormField
            control={form.control}
            name="royalty_period_type"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Period Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="calendar_year"
                        id="calendar_year"
                      />
                      <Label htmlFor="calendar_year" className="font-normal">
                        Calendar Year (Jan 1 - Dec 31)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fiscal_year" id="fiscal_year" />
                      <Label htmlFor="fiscal_year" className="font-normal">
                        Fiscal Year (uses fiscal year start setting above)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom" className="font-normal">
                        Custom
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Custom Period Configuration - AC-3 */}
          {royaltyPeriodType === "custom" && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              <FormField
                control={form.control}
                name="royalty_period_start_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Month</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value ? Number(value) : null)
                      }
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem
                            key={month.value}
                            value={month.value.toString()}
                          >
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="royalty_period_start_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Day</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value ? Number(value) : null)
                      }
                      value={field.value?.toString() || ""}
                      disabled={!royaltyPeriodStartMonth}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from(
                          {
                            length: royaltyPeriodStartMonth
                              ? getDaysInMonth(royaltyPeriodStartMonth)
                              : 31,
                          },
                          (_, i) => i + 1
                        ).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Fiscal year info message */}
          {royaltyPeriodType === "fiscal_year" && !fiscalYearStart && (
            <Alert>
              <AlertDescription>
                Configure fiscal year start date above for accurate period
                calculation
              </AlertDescription>
            </Alert>
          )}

          {/* Period Preview - AC-4 */}
          <div className="rounded-md bg-muted p-3 text-sm">
            {formatRoyaltyPeriodPreview(
              royaltyPeriodType,
              royaltyPeriodStartMonth,
              royaltyPeriodStartDay,
              fiscalYearStart || null
            )}
          </div>
        </div>

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
    </>
  );
}
