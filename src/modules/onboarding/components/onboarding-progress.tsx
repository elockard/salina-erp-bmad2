"use client";

/**
 * Onboarding Progress Component
 * Story 20.1: Build Onboarding Wizard
 * AC 20.1.8: Progress Indicator
 *
 * Displays visual progress bar with step indicators:
 * - Completed steps (green checkmark)
 * - Current step (highlighted)
 * - Upcoming steps (gray)
 * - Skipped steps (orange dash)
 */

import { Check, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getStepsWithStatus } from "../queries";
import type { OnboardingStepWithStatus, StepStatus } from "../types";
import { ONBOARDING_STEPS } from "../types";

interface OnboardingProgressProps {
  /** Current step number (1-5) */
  currentStep: number;
  /** Steps completion record */
  stepsCompleted: Record<string, boolean | "skipped">;
  /** Overall percentage complete (0-100) */
  percentComplete: number;
  /** Compact mode for dashboard widget */
  compact?: boolean;
  /** Optional class name */
  className?: string;
  /** Callback when clicking a step circle (for navigation) */
  onStepClick?: (stepNumber: number) => void;
}

/**
 * Get styles for step circle based on status
 */
function getStepCircleStyles(status: StepStatus): string {
  switch (status) {
    case "completed":
      return "bg-green-600 text-white border-green-600";
    case "current":
      return "bg-primary text-white border-primary ring-2 ring-primary/30";
    case "skipped":
      return "bg-orange-100 text-orange-600 border-orange-300";
    default:
      return "bg-muted text-muted-foreground border-muted-foreground/30";
  }
}

/**
 * Get the icon or number for a step circle
 */
function StepCircleContent({
  stepNumber,
  status,
}: {
  stepNumber: number;
  status: StepStatus;
}) {
  if (status === "completed") {
    return <Check className="h-4 w-4" />;
  }
  if (status === "skipped") {
    return <Minus className="h-4 w-4" />;
  }
  return <span className="text-sm font-medium">{stepNumber}</span>;
}

/**
 * Individual step indicator circle
 */
function StepCircle({
  step,
  isClickable,
  onClick,
}: {
  step: OnboardingStepWithStatus;
  isClickable: boolean;
  onClick?: () => void;
}) {
  const canClick =
    isClickable && (step.status === "completed" || step.status === "skipped");

  return (
    <button
      type="button"
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
        getStepCircleStyles(step.status),
        canClick && "cursor-pointer hover:ring-2 hover:ring-primary/20",
        !canClick && "cursor-default",
      )}
      aria-label={`Step ${step.number}: ${step.name} - ${step.status}`}
      title={`${step.name}${step.required ? " (Required)" : ""}`}
    >
      <StepCircleContent stepNumber={step.number} status={step.status} />
    </button>
  );
}

/**
 * Connector line between step circles
 */
function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className={cn(
        "h-0.5 flex-1 mx-1",
        completed ? "bg-green-600" : "bg-muted",
      )}
    />
  );
}

/**
 * Onboarding progress indicator component
 *
 * Shows:
 * - Progress bar with percentage
 * - Step circles with status indicators
 * - Current step label
 */
export function OnboardingProgress({
  currentStep,
  stepsCompleted,
  percentComplete,
  compact = false,
  className,
  onStepClick,
}: OnboardingProgressProps) {
  // Get steps with computed status
  const stepsWithStatus = getStepsWithStatus(currentStep, stepsCompleted);
  const currentStepInfo = stepsWithStatus.find((s) => s.number === currentStep);

  if (compact) {
    // Compact mode for dashboard widget
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Setup Progress</span>
          <span className="font-medium">{percentComplete}%</span>
        </div>
        <Progress value={percentComplete} className="h-2" />
        <p className="text-xs text-muted-foreground">
          Step {currentStep} of {ONBOARDING_STEPS.length}:{" "}
          {currentStepInfo?.name}
        </p>
      </div>
    );
  }

  // Full mode for wizard
  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">
            Onboarding Progress
          </span>
          <span className="font-semibold">{percentComplete}% Complete</span>
        </div>
        <Progress value={percentComplete} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {stepsWithStatus.map((step, index) => (
          <div
            key={step.number}
            className="flex items-center flex-1 last:flex-none"
          >
            <StepCircle
              step={step}
              isClickable={!!onStepClick}
              onClick={() => onStepClick?.(step.number)}
            />
            {index < stepsWithStatus.length - 1 && (
              <StepConnector
                completed={
                  step.status === "completed" || step.status === "skipped"
                }
              />
            )}
          </div>
        ))}
      </div>

      {/* Current step label */}
      <div className="text-center">
        <p className="text-sm font-medium">
          Step {currentStep}: {currentStepInfo?.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {currentStepInfo?.description}
        </p>
      </div>
    </div>
  );
}

export default OnboardingProgress;
