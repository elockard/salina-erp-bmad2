"use client";

/**
 * Contract Tier Builder
 *
 * Reusable component for configuring tiered royalty rates by format.
 * Used for Physical (Step 2), Ebook (Step 3), and Audiobook (Step 4).
 *
 * Story 4.2: Build Contract Creation Form with Tiered Royalty Configuration
 * AC 3: Dynamic tier builder with auto-fill, Add Tier, Infinity option
 * AC 4: Tier validation (sequential, non-overlapping, 0-100% rates)
 */

import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_TIERS = 5;

interface TierData {
  min_quantity: number;
  max_quantity: number | null;
  rate: number;
}

interface ContractTierBuilderProps {
  format: "physical" | "ebook" | "audiobook";
  tiersFieldName: "physical_tiers" | "ebook_tiers" | "audiobook_tiers";
  enabledFieldName: "physical_enabled" | "ebook_enabled" | "audiobook_enabled";
  title: string;
  description: string;
}

export function ContractTierBuilder({
  format,
  tiersFieldName,
  enabledFieldName,
  title,
  description,
}: ContractTierBuilderProps) {
  const { control, watch, setValue, getValues } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: tiersFieldName,
  });

  const isEnabled = watch(enabledFieldName);
  const tiers = watch(tiersFieldName) as TierData[];

  // Add a new tier with auto-filled min_quantity (AC 3)
  const handleAddTier = () => {
    if (fields.length >= MAX_TIERS) return;

    // Calculate new tier's min_quantity from previous tier's max
    let newMinQuantity = 0;
    if (tiers.length > 0) {
      const lastTier = tiers[tiers.length - 1];
      if (lastTier.max_quantity !== null) {
        newMinQuantity = lastTier.max_quantity + 1;
      } else {
        // Last tier was infinity, need to set a max first
        return;
      }
    }

    append({
      min_quantity: newMinQuantity,
      max_quantity: null, // New tier defaults to infinity
      rate: 0.1, // Default 10%
    });
  };

  // Remove a tier and adjust subsequent tiers
  const handleRemoveTier = (index: number) => {
    remove(index);
  };

  // Update tier and auto-fill next tier's min (AC 3)
  const handleMaxQuantityChange = (index: number, value: string) => {
    const numValue = value === "" ? null : parseInt(value, 10);

    // Update current tier
    setValue(`${tiersFieldName}.${index}.max_quantity`, numValue);

    // Auto-fill next tier's min if it exists (AC 3)
    if (numValue !== null && index < tiers.length - 1) {
      setValue(`${tiersFieldName}.${index + 1}.min_quantity`, numValue + 1);
    }
  };

  // Convert rate display (0.10 -> 10)
  const rateToPercent = (rate: number): string => {
    return (rate * 100).toFixed(0);
  };

  // Convert percent input to rate (10 -> 0.10)
  const percentToRate = (percent: string): number => {
    const num = parseFloat(percent);
    if (isNaN(num)) return 0;
    return Math.min(1, Math.max(0, num / 100));
  };

  // Toggle format enabled state
  const handleEnabledChange = (checked: boolean) => {
    setValue(enabledFieldName, checked);
    if (checked && tiers.length === 0) {
      // Add default first tier when enabling
      append({
        min_quantity: 0,
        max_quantity: null,
        rate: 0.1,
      });
    }
  };

  // Check if we can add more tiers
  const canAddTier =
    isEnabled &&
    fields.length < MAX_TIERS &&
    (tiers.length === 0 ||
      tiers[tiers.length - 1]?.max_quantity !== null);

  // Validate tiers (AC 4)
  const getTierValidationError = (): string | null => {
    if (!isEnabled) return null;
    if (tiers.length === 0) return "At least one tier is required";

    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];

      // First tier must start at 0
      if (i === 0 && tier.min_quantity !== 0) {
        return "First tier must start at 0 units";
      }

      // Check sequential (AC 4)
      if (i > 0) {
        const prevTier = tiers[i - 1];
        if (prevTier.max_quantity === null) {
          return `Tier ${i} cannot follow an unlimited tier`;
        }
        if (tier.min_quantity !== prevTier.max_quantity + 1) {
          return `Tier ${i + 1} must start at ${prevTier.max_quantity + 1} (previous tier ends at ${prevTier.max_quantity})`;
        }
      }

      // Rate validation (AC 4)
      if (tier.rate < 0 || tier.rate > 1) {
        return `Tier ${i + 1} rate must be between 0% and 100%`;
      }
    }

    // Last tier should be infinity
    const lastTier = tiers[tiers.length - 1];
    if (lastTier.max_quantity !== null) {
      return "Last tier should have no maximum (unlimited)";
    }

    return null;
  };

  const validationError = getTierValidationError();

  return (
    <div className="space-y-6">
      {/* Header with enable toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${format}-enabled`}
            checked={isEnabled}
            onCheckedChange={handleEnabledChange}
          />
          <Label htmlFor={`${format}-enabled`} className="text-sm">
            Enable {format}
          </Label>
        </div>
      </div>

      {/* Example display (AC 3) */}
      {isEnabled && (
        <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
          <strong>Example:</strong> 0-5,000 units @ 10%, 5,001-10,000 units @ 12%, 10,001+ units @ 15%
        </div>
      )}

      {/* Validation error */}
      {validationError && isEnabled && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Tier rows */}
      {isEnabled && (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const tier = tiers[index];
            const isLastTier = index === fields.length - 1;

            return (
              <div
                key={field.id}
                className={cn(
                  "p-4 border rounded-lg space-y-4",
                  "bg-card"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Tier {index + 1}</span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTier(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Min Quantity */}
                  <FormField
                    control={control}
                    name={`${tiersFieldName}.${index}.min_quantity`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <FormLabel>From (units)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            disabled={index > 0} // Auto-filled from previous tier
                            {...inputField}
                            value={inputField.value ?? 0}
                            onChange={(e) =>
                              inputField.onChange(parseInt(e.target.value, 10) || 0)
                            }
                          />
                        </FormControl>
                        {index > 0 && (
                          <FormDescription className="text-xs">
                            Auto-filled
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Max Quantity (AC 3 - Infinity option) */}
                  <FormItem>
                    <FormLabel>To (units)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min={tier?.min_quantity ? tier.min_quantity + 1 : 1}
                          placeholder={isLastTier ? "∞" : ""}
                          value={tier?.max_quantity ?? ""}
                          onChange={(e) =>
                            handleMaxQuantityChange(index, e.target.value)
                          }
                        />
                        {isLastTier && tier?.max_quantity === null && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            ∞
                          </span>
                        )}
                      </div>
                    </FormControl>
                    {isLastTier && (
                      <FormDescription className="text-xs">
                        Leave empty for unlimited
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>

                  {/* Rate (AC 4 - 0-100%) */}
                  <FormField
                    control={control}
                    name={`${tiersFieldName}.${index}.rate`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <FormLabel>Royalty Rate</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              className="pr-8"
                              value={rateToPercent(inputField.value ?? 0)}
                              onChange={(e) =>
                                inputField.onChange(percentToRate(e.target.value))
                              }
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              %
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tier summary */}
                <div className="text-sm text-muted-foreground pt-2 border-t">
                  {tier?.min_quantity ?? 0} - {tier?.max_quantity ?? "∞"} units @{" "}
                  {rateToPercent(tier?.rate ?? 0)}% royalty
                </div>
              </div>
            );
          })}

          {/* Add Tier button (AC 3 - max 5 tiers) */}
          {canAddTier && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAddTier}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Tier ({fields.length}/{MAX_TIERS})
            </Button>
          )}

          {fields.length >= MAX_TIERS && (
            <p className="text-sm text-muted-foreground text-center">
              Maximum of {MAX_TIERS} tiers reached
            </p>
          )}

          {!canAddTier && fields.length > 0 && fields.length < MAX_TIERS && (
            <p className="text-sm text-muted-foreground text-center">
              Set a maximum for the last tier to add another tier
            </p>
          )}
        </div>
      )}

      {/* Disabled state */}
      {!isEnabled && (
        <div className="p-8 border rounded-lg border-dashed text-center text-muted-foreground">
          <p>Enable this format to configure royalty tiers</p>
        </div>
      )}
    </div>
  );
}
