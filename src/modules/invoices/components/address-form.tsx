"use client";

/**
 * Address Form Component
 *
 * Reusable address input section for bill-to and ship-to addresses.
 * Integrates with react-hook-form using FormField pattern.
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.2: Header section includes bill-to and ship-to addresses
 * AC-8.2.8: Customer address auto-populate from CustomerRoleData
 *
 * Fields: line1, line2, city, state, postal_code, country
 */

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Address } from "@/modules/contacts/types";

// =============================================================================
// Types
// =============================================================================

interface AddressFormProps {
  /** Field name prefix (e.g., "bill_to_address" or "ship_to_address") */
  prefix: "bill_to_address" | "ship_to_address";
  /** Section title displayed above address fields */
  title: string;
  /** Whether all fields are disabled */
  disabled?: boolean;
}

interface AddressFormWithSameAsProps {
  /** Whether to show "Same as bill-to" checkbox */
  showSameAs?: boolean;
  /** Section title displayed above address fields */
  title: string;
  /** Whether all fields are disabled */
  disabled?: boolean;
}

// =============================================================================
// Address Fields Component (Internal)
// =============================================================================

/**
 * Individual address fields that can be reused for bill-to and ship-to
 */
function AddressFields({
  prefix,
  disabled,
}: {
  prefix: "bill_to_address" | "ship_to_address";
  disabled?: boolean;
}) {
  const { control } = useFormContext();

  return (
    <div className="grid gap-4">
      {/* Address Line 1 */}
      <FormField
        control={control}
        name={`${prefix}.line1`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address Line 1</FormLabel>
            <FormControl>
              <Input
                placeholder="Street address"
                disabled={disabled}
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Address Line 2 */}
      <FormField
        control={control}
        name={`${prefix}.line2`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address Line 2</FormLabel>
            <FormControl>
              <Input
                placeholder="Apt, suite, unit, etc. (optional)"
                disabled={disabled}
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* City, State, Postal Code row */}
      <div className="grid grid-cols-6 gap-4">
        {/* City */}
        <FormField
          control={control}
          name={`${prefix}.city`}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input
                  placeholder="City"
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* State */}
        <FormField
          control={control}
          name={`${prefix}.state`}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>State / Province</FormLabel>
              <FormControl>
                <Input
                  placeholder="State"
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Postal Code */}
        <FormField
          control={control}
          name={`${prefix}.postal_code`}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Postal Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="ZIP / Postal"
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Country */}
      <FormField
        control={control}
        name={`${prefix}.country`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country</FormLabel>
            <FormControl>
              <Input
                placeholder="Country"
                disabled={disabled}
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// =============================================================================
// Bill-To Address Form
// =============================================================================

/**
 * Bill-to address form section
 */
export function BillToAddressForm({ title, disabled }: AddressFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{title}</h3>
      <AddressFields prefix="bill_to_address" disabled={disabled} />
    </div>
  );
}

// =============================================================================
// Ship-To Address Form with "Same as Bill-To" Option
// =============================================================================

/**
 * Ship-to address form section with "Same as bill-to" checkbox
 *
 * AC-8.2.2: "Same as bill-to" checkbox syncs ship-to with bill-to
 */
export function ShipToAddressForm({
  title,
  disabled,
  showSameAs = true,
}: AddressFormWithSameAsProps) {
  const { control, setValue, getValues, watch } = useFormContext();

  // Watch the "same as bill-to" checkbox
  const sameAsBillTo = useWatch({ control, name: "same_as_bill_to" });

  // Watch bill-to address for syncing
  const billToAddress = useWatch({ control, name: "bill_to_address" });

  // Sync ship-to with bill-to when checkbox is checked
  useEffect(() => {
    if (sameAsBillTo && billToAddress) {
      setValue("ship_to_address", billToAddress, { shouldValidate: true });
    }
  }, [sameAsBillTo, billToAddress, setValue]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>

        {showSameAs && (
          <FormField
            control={control}
            name="same_as_bill_to"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal cursor-pointer">
                  Same as bill-to
                </FormLabel>
              </FormItem>
            )}
          />
        )}
      </div>

      <AddressFields
        prefix="ship_to_address"
        disabled={disabled || sameAsBillTo}
      />
    </div>
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create an empty address object
 */
export function createEmptyAddress(): Address {
  return {
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  };
}

/**
 * Check if an address is empty (all fields blank or undefined)
 */
export function isAddressEmpty(address: Address | undefined | null): boolean {
  if (!address) return true;
  return !address.line1 && !address.line2 && !address.city && !address.state && !address.postal_code && !address.country;
}
