"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { formatEIN } from "@/lib/tin-validation";
import { getPayerInfo, updatePayerInfo } from "../actions";
import {
  type UpdatePayerInfoFormInput,
  updatePayerInfoFormSchema,
} from "../schema";

/**
 * US State options for dropdown
 */
const _US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
] as const;

/**
 * Payer Information Form Component
 *
 * Story 11.3 - AC-11.3.3: Payer Information for 1099 Generation
 *
 * Allows configuration of:
 * - Payer EIN (XX-XXXXXXX format)
 * - Payer legal name
 * - Payer address (required for IRS Box 1)
 */
export function PayerInfoForm() {
  const [loading, setLoading] = useState(true);
  const [hasExistingInfo, setHasExistingInfo] = useState(false);
  const [existingLastFour, setExistingLastFour] = useState<string | null>(null);

  const form = useForm<UpdatePayerInfoFormInput>({
    resolver: zodResolver(updatePayerInfoFormSchema),
    defaultValues: {
      payer_ein: "",
      payer_name: "",
      payer_address_line1: "",
      payer_address_line2: "",
      payer_city: "",
      payer_state: "",
      payer_zip: "",
    },
  });

  // Load existing payer info on mount
  useEffect(() => {
    async function loadPayerInfo() {
      const result = await getPayerInfo();
      if (result.success) {
        const data = result.data;
        setHasExistingInfo(data.has_payer_info);
        setExistingLastFour(data.payer_ein_last_four);

        // Pre-fill form with existing data (except EIN which is encrypted)
        if (data.has_payer_info) {
          form.reset({
            payer_ein: "", // User must re-enter EIN for security
            payer_name: data.payer_name || "",
            payer_address_line1: data.payer_address_line1 || "",
            payer_address_line2: data.payer_address_line2 || "",
            payer_city: data.payer_city || "",
            payer_state: data.payer_state || "",
            payer_zip: data.payer_zip || "",
          });
        }
      } else {
        toast.error(result.error);
      }
      setLoading(false);
    }
    loadPayerInfo();
  }, [form]);

  async function onSubmit(data: UpdatePayerInfoFormInput) {
    const result = await updatePayerInfo(data);
    if (result.success) {
      toast.success("Payer information saved successfully");
      setHasExistingInfo(true);
      setExistingLastFour(result.data.payer_ein_last_four);
      // Clear the EIN field after successful save for security
      form.setValue("payer_ein", "");
    } else {
      toast.error(result.error || "Failed to save payer information");
    }
  }

  const isDirty = form.formState.isDirty;
  const isValid = form.formState.isValid;
  const isSubmitting = form.formState.isSubmitting;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>1099 Payer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1099 Payer Information</CardTitle>
        <CardDescription>
          Configure your company's information for IRS 1099-MISC forms. This
          information will appear in the payer section of all generated 1099
          forms.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasExistingInfo && (
          <Alert className="mb-6">
            <AlertTitle>Required for 1099 Generation</AlertTitle>
            <AlertDescription>
              Complete payer information is required before you can generate
              1099-MISC forms for authors who earned $10 or more in royalties.
            </AlertDescription>
          </Alert>
        )}

        {hasExistingInfo && existingLastFour && (
          <Alert className="mb-6">
            <AlertTitle>Payer Information Configured</AlertTitle>
            <AlertDescription>
              Current EIN on file: **-***{existingLastFour}. To update the EIN,
              enter the full EIN below.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* EIN Field */}
            <FormField
              control={form.control}
              name="payer_ein"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employer Identification Number (EIN)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="12-3456789"
                      onChange={(e) => {
                        const formatted = formatEIN(e.target.value);
                        field.onChange(formatted);
                      }}
                      maxLength={10}
                    />
                  </FormControl>
                  <FormDescription>
                    Your company's EIN in XX-XXXXXXX format
                    {hasExistingInfo && " (re-enter to update)"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Legal Name */}
            <FormField
              control={form.control}
              name="payer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal Business Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Acme Publishing LLC" />
                  </FormControl>
                  <FormDescription>
                    Your company's legal name as registered with the IRS
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Line 1 */}
            <FormField
              control={form.control}
              name="payer_address_line1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Main Street" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Line 2 */}
            <FormField
              control={form.control}
              name="payer_address_line2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Address Line 2{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Suite 100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City, State, ZIP row */}
            <div className="grid grid-cols-6 gap-4">
              <FormField
                control={form.control}
                name="payer_city"
                render={({ field }) => (
                  <FormItem className="col-span-3">
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="New York" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payer_state"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="NY"
                        maxLength={2}
                        onChange={(e) => {
                          field.onChange(e.target.value.toUpperCase());
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payer_zip"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="10001" maxLength={10} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={!isDirty || isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isDirty || !isValid || isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Payer Information"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
