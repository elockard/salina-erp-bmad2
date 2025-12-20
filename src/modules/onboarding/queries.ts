/**
 * Onboarding module queries
 * Story 20.1: Build Onboarding Wizard
 */

import { getDb } from "@/lib/auth";
import type {
  OnboardingProgress,
  OnboardingStepWithStatus,
  StepStatus,
} from "./types";
import { ONBOARDING_STEPS } from "./types";

/**
 * Calculate progress percentage based on required steps completed
 * AC 20.1.8: Progress Indicator - 100% means all required steps completed
 */
export function calculateProgress(
  stepsCompleted: Record<string, boolean | "skipped">,
): number {
  const requiredSteps = ONBOARDING_STEPS.filter((s) => s.required);
  const completedRequired = requiredSteps.filter(
    (s) => stepsCompleted[s.number.toString()] === true,
  ).length;
  return Math.round((completedRequired / requiredSteps.length) * 100);
}

/**
 * Get step status for progress indicator
 * AC 20.1.8: Step indicators showing completed/current/upcoming
 */
export function getStepStatus(
  stepNumber: number,
  currentStep: number,
  stepsCompleted: Record<string, boolean | "skipped">,
): StepStatus {
  const stepKey = stepNumber.toString();
  if (stepsCompleted[stepKey] === true) {
    return "completed";
  }
  if (stepsCompleted[stepKey] === "skipped") {
    return "skipped";
  }
  if (stepNumber === currentStep) {
    return "current";
  }
  return "upcoming";
}

/**
 * Get all steps with their current status
 */
export function getStepsWithStatus(
  currentStep: number,
  stepsCompleted: Record<string, boolean | "skipped">,
): OnboardingStepWithStatus[] {
  return ONBOARDING_STEPS.map((step) => ({
    ...step,
    status: getStepStatus(step.number, currentStep, stepsCompleted),
  }));
}

/**
 * Get onboarding progress for current tenant
 * AC 20.1.12: Persistence Across Sessions
 *
 * @returns Onboarding progress with computed fields, or null if not started
 */
export async function getOnboardingProgress(): Promise<OnboardingProgress | null> {
  const db = await getDb();

  const result = await db.query.onboardingProgress.findFirst();

  if (!result) {
    return null;
  }

  const stepsCompleted = result.steps_completed as Record<
    string,
    boolean | "skipped"
  >;
  const percentComplete = calculateProgress(stepsCompleted);
  const isComplete =
    result.status === "completed" || result.status === "dismissed";

  return {
    ...result,
    percentComplete,
    isComplete,
  };
}

/**
 * Check if onboarding should be shown to the current tenant
 * AC 20.1.1: New Tenant Wizard Trigger
 *
 * Returns true if:
 * - No progress record exists (new tenant)
 * - Progress exists but status is not_started or in_progress
 */
export async function shouldShowOnboarding(): Promise<boolean> {
  const progress = await getOnboardingProgress();

  // No progress record = new tenant, show onboarding
  if (!progress) {
    return true;
  }

  // Only show if not completed or dismissed
  return progress.status === "not_started" || progress.status === "in_progress";
}

/**
 * Check if onboarding widget should be shown on dashboard
 * AC 20.1.11: Dashboard Onboarding Widget
 *
 * Returns true if progress exists and status is in_progress
 */
export async function shouldShowOnboardingWidget(): Promise<boolean> {
  const progress = await getOnboardingProgress();

  if (!progress) {
    return false;
  }

  return progress.status === "in_progress";
}

/**
 * Get onboarding completion summary
 * AC 20.1.10: Onboarding Completion - quick stats
 */
export async function getOnboardingCompletionSummary(): Promise<{
  companyConfigured: boolean;
  teamMemberInvited: boolean;
  contactCreated: boolean;
  contactName?: string;
  titleCreated: boolean;
  titleName?: string;
  isbnConfigured: boolean;
  isbnPrefix?: string;
}> {
  const progress = await getOnboardingProgress();

  if (!progress) {
    return {
      companyConfigured: false,
      teamMemberInvited: false,
      contactCreated: false,
      titleCreated: false,
      isbnConfigured: false,
    };
  }

  const stepsCompleted = progress.steps_completed as Record<
    string,
    boolean | "skipped"
  >;
  const stepData = progress.step_data as Record<
    string,
    Record<string, unknown>
  >;

  return {
    companyConfigured: stepsCompleted["1"] === true,
    teamMemberInvited: stepsCompleted["2"] === true,
    contactCreated: stepsCompleted["3"] === true,
    contactName: stepData["3"]?.contactName as string | undefined,
    titleCreated: stepsCompleted["4"] === true,
    titleName: stepData["4"]?.titleName as string | undefined,
    isbnConfigured: stepsCompleted["5"] === true,
    isbnPrefix: stepData["5"]?.isbnPrefix as string | undefined,
  };
}
