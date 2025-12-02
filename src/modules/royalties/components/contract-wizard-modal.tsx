"use client";

/**
 * Contract Wizard Modal
 *
 * Multi-step wizard for creating royalty contracts with tiered rates.
 * Implements "Wizard-Guided Modal" pattern from UX spec.
 *
 * Story 4.2: Build Contract Creation Form with Tiered Royalty Configuration
 * AC 1: 5-step wizard (Basic Info, Physical, Ebook, Audiobook, Review)
 *
 * Steps:
 * 1. Basic Information - Author, Title, Status, Advance
 * 2. Physical Book Tiers - Tiered rates for physical format
 * 3. Ebook Tiers - Tiered rates for ebook format
 * 4. Audiobook Tiers - Optional tiered rates for audiobook
 * 5. Review & Create - Summary and submission
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, FileText, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createContract } from "../actions";
import type { ContractFormat, TierInput } from "../types";
import { ContractStepBasicInfo } from "./contract-step-basic-info";
import { ContractStepReview } from "./contract-step-review";
import { ContractTierBuilder } from "./contract-tier-builder";

/**
 * Step definitions for the wizard
 */
const STEPS = [
  { id: 1, name: "Basic Info", shortName: "Info" },
  { id: 2, name: "Physical Tiers", shortName: "Physical" },
  { id: 3, name: "Ebook Tiers", shortName: "Ebook" },
  { id: 4, name: "Audiobook", shortName: "Audio" },
  { id: 5, name: "Review", shortName: "Review" },
] as const;

/**
 * Tier schema for each format's tiers
 */
const tierSchema = z.object({
  min_quantity: z.number().int().min(0),
  max_quantity: z.number().int().min(1).nullable(),
  rate: z.number().min(0).max(1),
});

/**
 * Form data type for the wizard (used for type checking)
 */
interface WizardFormData {
  author_id: string;
  author_name: string;
  title_id: string;
  title_name: string;
  status: "active" | "suspended" | "terminated";
  advance_amount: string;
  advance_paid: string;
  physical_tiers: {
    min_quantity: number;
    max_quantity: number | null;
    rate: number;
  }[];
  ebook_tiers: {
    min_quantity: number;
    max_quantity: number | null;
    rate: number;
  }[];
  audiobook_tiers: {
    min_quantity: number;
    max_quantity: number | null;
    rate: number;
  }[];
  physical_enabled: boolean;
  ebook_enabled: boolean;
  audiobook_enabled: boolean;
}

/**
 * Form schema for the wizard
 * Validation happens per-step and on final submission
 */
const wizardFormSchema = z.object({
  // Step 1: Basic Info
  author_id: z.string().min(1, "Please select an author"),
  author_name: z.string(),
  title_id: z.string().min(1, "Please select a title"),
  title_name: z.string(),
  status: z.enum(["active", "suspended", "terminated"]),
  advance_amount: z.string(),
  advance_paid: z.string(),
  // Steps 2-4: Tiers by format
  physical_tiers: z.array(tierSchema),
  ebook_tiers: z.array(tierSchema),
  audiobook_tiers: z.array(tierSchema),
  // Track which formats are enabled
  physical_enabled: z.boolean(),
  ebook_enabled: z.boolean(),
  audiobook_enabled: z.boolean(),
});

interface ContractWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (contractId: string) => void;
  /** Pre-fill author when opening from author detail */
  defaultAuthorId?: string;
  defaultAuthorName?: string;
  /** Pre-fill title when opening from title detail */
  defaultTitleId?: string;
  defaultTitleName?: string;
}

export function ContractWizardModal({
  open,
  onOpenChange,
  onSuccess,
  defaultAuthorId,
  defaultAuthorName,
  defaultTitleId,
  defaultTitleName,
}: ContractWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  const methods = useForm<WizardFormData>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues: {
      author_id: defaultAuthorId || "",
      author_name: defaultAuthorName || "",
      title_id: defaultTitleId || "",
      title_name: defaultTitleName || "",
      status: "active",
      advance_amount: "0",
      advance_paid: "0",
      physical_tiers: [{ min_quantity: 0, max_quantity: null, rate: 0.1 }],
      ebook_tiers: [],
      audiobook_tiers: [],
      physical_enabled: true,
      ebook_enabled: false,
      audiobook_enabled: false,
    },
  });

  const { watch, setValue, reset, handleSubmit } = methods;
  const formData = watch();

  // Reset form when modal opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCurrentStep(1);
      reset({
        author_id: defaultAuthorId || "",
        author_name: defaultAuthorName || "",
        title_id: defaultTitleId || "",
        title_name: defaultTitleName || "",
        status: "active",
        advance_amount: "0",
        advance_paid: "0",
        physical_tiers: [{ min_quantity: 0, max_quantity: null, rate: 0.1 }],
        ebook_tiers: [],
        audiobook_tiers: [],
        physical_enabled: true,
        ebook_enabled: false,
        audiobook_enabled: false,
      });
    }
    onOpenChange(open);
  };

  // Validate current step before proceeding
  const validateStep = (): boolean => {
    switch (currentStep) {
      case 1:
        // Basic info: need author and title
        if (!formData.author_id || !formData.title_id) {
          toast.error("Please select both an author and a title");
          return false;
        }
        return true;
      case 2:
        // Physical tiers: need at least one if enabled
        if (formData.physical_enabled && formData.physical_tiers.length === 0) {
          toast.error("Please add at least one tier for physical books");
          return false;
        }
        return true;
      case 3:
        // Ebook tiers: need at least one if enabled
        if (formData.ebook_enabled && formData.ebook_tiers.length === 0) {
          toast.error("Please add at least one tier for ebooks");
          return false;
        }
        return true;
      case 4:
        // Audiobook is optional
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep() && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Only step 4 (audiobook) can be skipped
    if (currentStep === 4) {
      setValue("audiobook_enabled", false);
      setValue("audiobook_tiers", []);
      setCurrentStep(5);
    }
  };

  // Submit contract creation
  const onSubmit = (data: WizardFormData) => {
    // Build tiers array from all formats
    const tiers: TierInput[] = [];

    if (data.physical_enabled && data.physical_tiers.length > 0) {
      tiers.push(
        ...data.physical_tiers.map((t) => ({
          ...t,
          format: "physical" as ContractFormat,
        })),
      );
    }

    if (data.ebook_enabled && data.ebook_tiers.length > 0) {
      tiers.push(
        ...data.ebook_tiers.map((t) => ({
          ...t,
          format: "ebook" as ContractFormat,
        })),
      );
    }

    if (data.audiobook_enabled && data.audiobook_tiers.length > 0) {
      tiers.push(
        ...data.audiobook_tiers.map((t) => ({
          ...t,
          format: "audiobook" as ContractFormat,
        })),
      );
    }

    if (tiers.length === 0) {
      toast.error("Please configure at least one format with tiers");
      return;
    }

    startTransition(async () => {
      const result = await createContract({
        author_id: data.author_id,
        title_id: data.title_id,
        status: data.status,
        advance_amount: data.advance_amount || "0",
        advance_paid: data.advance_paid || "0",
        tiers,
      });

      if (result.success) {
        toast.success(
          `✓ Contract created for ${result.data.author_name} - ${result.data.title_name}`,
        );
        handleOpenChange(false);
        onSuccess?.(result.data.id);
      } else {
        toast.error(result.error);
      }
    });
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ContractStepBasicInfo />;
      case 2:
        return (
          <ContractTierBuilder
            format="physical"
            tiersFieldName="physical_tiers"
            enabledFieldName="physical_enabled"
            title="Physical Book Royalty Tiers"
            description="Configure tiered royalty rates for physical book sales"
          />
        );
      case 3:
        return (
          <ContractTierBuilder
            format="ebook"
            tiersFieldName="ebook_tiers"
            enabledFieldName="ebook_enabled"
            title="Ebook Royalty Tiers"
            description="Configure tiered royalty rates for ebook sales"
          />
        );
      case 4:
        return (
          <ContractTierBuilder
            format="audiobook"
            tiersFieldName="audiobook_tiers"
            enabledFieldName="audiobook_enabled"
            title="Audiobook Royalty Tiers (Optional)"
            description="Configure tiered royalty rates for audiobook sales. You can skip this step if not applicable."
          />
        );
      case 5:
        return <ContractStepReview />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Royalty Contract
          </DialogTitle>
          <DialogDescription>
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator (AC 1) */}
        <div className="flex items-center justify-between px-2 py-4 border-b">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  currentStep > step.id
                    ? "bg-green-500 text-white"
                    : currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={cn(
                  "ml-2 text-xs hidden sm:inline",
                  currentStep >= step.id
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.shortName}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-2",
                    currentStep > step.id ? "bg-green-500" : "bg-muted",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto"
          >
            <div className="p-4">{renderStepContent()}</div>
          </form>
        </FormProvider>

        {/* Footer with navigation buttons */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>

          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isPending}
              >
                Back
              </Button>
            )}

            {currentStep === 4 && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                disabled={isPending}
              >
                Skip
              </Button>
            )}

            {currentStep < 5 ? (
              <Button type="button" onClick={handleNext} disabled={isPending}>
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Contract"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
