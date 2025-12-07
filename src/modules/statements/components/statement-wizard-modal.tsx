"use client";

/**
 * Statement Generation Wizard Modal
 *
 * Multi-step wizard for generating royalty statements for authors.
 * Implements "Wizard-Guided Modal" pattern from UX spec.
 *
 * Story 5.3: Build Statement Generation Wizard for Finance
 * AC-5.3.1: 4-step wizard flow: Period → Authors → Preview → Generate
 *
 * Steps:
 * 1. Period Selection - Quarterly, Annual, or Custom date range
 * 2. Author Selection - Select All or individual authors with search
 * 3. Preview - Show calculation estimates before generation
 * 4. Generate - Confirm and trigger batch statement generation
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
import type { AuthorWithPendingRoyalties, PreviewCalculation } from "../types";
import { StatementStepAuthors } from "./statement-step-authors";
import { StatementStepGenerate } from "./statement-step-generate";
import { StatementStepPeriod } from "./statement-step-period";
import { StatementStepPreview } from "./statement-step-preview";

/**
 * Step definitions for the wizard (AC-5.3.1)
 */
const STEPS = [
  { id: 1, name: "Period", shortName: "Period" },
  { id: 2, name: "Authors", shortName: "Authors" },
  { id: 3, name: "Preview", shortName: "Preview" },
  { id: 4, name: "Generate", shortName: "Generate" },
] as const;

/**
 * Period type options (AC-5.3.2, Story 7.5 AC-5)
 */
export type PeriodType = "royalty_period" | "quarterly" | "annual" | "custom";

/**
 * Quarter options for quarterly period selection
 */
export type Quarter = 1 | 2 | 3 | 4;

/**
 * Form schema for the wizard
 * Validation happens per-step and on final submission
 */
const wizardFormSchema = z.object({
  // Step 1: Period Selection (AC-5.3.2, Story 7.5 AC-5)
  periodType: z.enum(["royalty_period", "quarterly", "annual", "custom"]),
  quarter: z.number().min(1).max(4).optional(),
  year: z.number().min(2020).max(2100),
  customStartDate: z.date().optional(),
  customEndDate: z.date().optional(),
  // Resolved period dates (computed from above)
  periodStart: z.date(),
  periodEnd: z.date(),

  // Step 2: Author Selection (AC-5.3.3)
  selectAll: z.boolean(),
  selectedAuthorIds: z.array(z.string()),

  // Step 4: Generate Options
  sendEmail: z.boolean(),
  exportCsv: z.boolean(),
});

export type WizardFormData = z.infer<typeof wizardFormSchema>;

interface StatementWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (jobId: string) => void;
}

export function StatementWizardModal({
  open,
  onOpenChange,
  onSuccess,
}: StatementWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // State for data loaded during wizard flow
  const [authors, setAuthors] = useState<AuthorWithPendingRoyalties[]>([]);
  const [previewData, setPreviewData] = useState<PreviewCalculation[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Get current year and previous quarter as default
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3) as Quarter;
  // Default to previous quarter (or Q4 of previous year if currently Q1)
  const defaultQuarter =
    currentQuarter === 1 ? 4 : ((currentQuarter - 1) as Quarter);
  const defaultYear = currentQuarter === 1 ? currentYear - 1 : currentYear;

  const methods = useForm<WizardFormData>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues: {
      periodType: "quarterly",
      quarter: defaultQuarter,
      year: defaultYear,
      periodStart: new Date(),
      periodEnd: new Date(),
      selectAll: true,
      selectedAuthorIds: [],
      sendEmail: true,
      exportCsv: false,
    },
  });

  const { watch, setValue, reset, handleSubmit } = methods;
  const formData = watch();

  // Reset form when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCurrentStep(1);
      setAuthors([]);
      setPreviewData([]);
      reset({
        periodType: "quarterly",
        quarter: defaultQuarter,
        year: defaultYear,
        periodStart: new Date(),
        periodEnd: new Date(),
        selectAll: true,
        selectedAuthorIds: [],
        sendEmail: true,
        exportCsv: false,
      });
    }
    onOpenChange(isOpen);
  };

  /**
   * Resolve period dates from form values (AC-5.3.2)
   */
  const resolvePeriodDates = (): { start: Date; end: Date } => {
    const { periodType, quarter, year, customStartDate, customEndDate } =
      formData;

    if (periodType === "quarterly" && quarter && year) {
      // Quarter start: first day of quarter
      const startMonth = (quarter - 1) * 3;
      const start = new Date(year, startMonth, 1);
      // Quarter end: last day of quarter
      const end = new Date(year, startMonth + 3, 0);
      return { start, end };
    }

    if (periodType === "annual" && year) {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return { start, end };
    }

    if (periodType === "custom" && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }

    // Fallback to current month
    const start = new Date(currentYear, currentDate.getMonth(), 1);
    const end = new Date(currentYear, currentDate.getMonth() + 1, 0);
    return { start, end };
  };

  /**
   * Validate current step before proceeding (AC-5.3.1)
   */
  const validateStep = async (): Promise<boolean> => {
    switch (currentStep) {
      case 1: {
        // Period: validate dates are resolved
        const { periodType, quarter, year, customStartDate, customEndDate } =
          formData;

        if (periodType === "quarterly" && (!quarter || !year)) {
          toast.error("Please select a quarter and year");
          return false;
        }
        if (periodType === "annual" && !year) {
          toast.error("Please select a year");
          return false;
        }
        if (periodType === "custom") {
          if (!customStartDate || !customEndDate) {
            toast.error("Please select start and end dates");
            return false;
          }
          if (customEndDate <= customStartDate) {
            toast.error("End date must be after start date");
            return false;
          }
        }

        // Resolve and store period dates
        const { start, end } = resolvePeriodDates();
        setValue("periodStart", start);
        setValue("periodEnd", end);
        return true;
      }

      case 2: {
        // Authors: need at least one selected
        const { selectAll, selectedAuthorIds } = formData;
        if (!selectAll && selectedAuthorIds.length === 0) {
          toast.error("Please select at least one author");
          return false;
        }
        return true;
      }

      case 3: {
        // Preview: just verify we have data
        if (previewData.length === 0) {
          toast.error(
            "No preview data available. Please go back and adjust selections.",
          );
          return false;
        }
        return true;
      }

      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Submit statement generation (AC-5.3.5)
   */
  const onSubmit = async (data: WizardFormData) => {
    startTransition(async () => {
      try {
        // Import and call server action
        const { generateStatements } = await import("../actions");
        const authorIds = data.selectAll
          ? authors.map((a) => a.id)
          : data.selectedAuthorIds;

        const result = await generateStatements({
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          authorIds,
          sendEmail: data.sendEmail,
        });

        if (result.success) {
          toast.success(
            `✓ Statement generation started for ${result.data.authorCount} author${result.data.authorCount === 1 ? "" : "s"}`,
          );
          handleOpenChange(false);
          onSuccess?.(result.data.jobId);
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Statement generation failed:", error);
        toast.error("Failed to start statement generation");
      }
    });
  };

  /**
   * Render step content based on current step
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StatementStepPeriod />;
      case 2:
        return (
          <StatementStepAuthors
            authors={authors}
            setAuthors={setAuthors}
            periodStart={formData.periodStart}
            periodEnd={formData.periodEnd}
          />
        );
      case 3:
        return (
          <StatementStepPreview
            previewData={previewData}
            setPreviewData={setPreviewData}
            isLoading={isLoadingPreview}
            setIsLoading={setIsLoadingPreview}
            periodStart={formData.periodStart}
            periodEnd={formData.periodEnd}
            authorIds={
              formData.selectAll
                ? authors.map((a) => a.id)
                : formData.selectedAuthorIds
            }
          />
        );
      case 4:
        return (
          <StatementStepGenerate
            periodStart={formData.periodStart}
            periodEnd={formData.periodEnd}
            authorCount={
              formData.selectAll
                ? authors.length
                : formData.selectedAuthorIds.length
            }
            previewData={previewData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Royalty Statements
          </DialogTitle>
          <DialogDescription>
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator (AC-5.3.1) */}
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
                    "w-12 h-0.5 mx-2",
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

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isPending || isLoadingPreview}
              >
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
                    Generating...
                  </>
                ) : (
                  "Generate Statements"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
