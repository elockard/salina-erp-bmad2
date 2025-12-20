"use server";

/**
 * Onboarding module server actions
 * Story 20.1: Build Onboarding Wizard
 */

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { onboardingProgress } from "@/db/schema/onboarding";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { calculateProgress } from "./queries";
import {
  type UpdateOnboardingStepInput,
  updateOnboardingStepSchema,
} from "./schema";
import type { OnboardingProgress, StepData, StepsCompleted } from "./types";

/**
 * Initialize onboarding progress for a new tenant
 * Creates record with not_started status
 */
export async function initializeOnboarding(): Promise<
  ActionResult<OnboardingProgress>
> {
  try {
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Check if already exists
    const existing = await db.query.onboardingProgress.findFirst();
    if (existing) {
      return {
        success: true,
        data: {
          ...existing,
          percentComplete: calculateProgress(
            existing.steps_completed as StepsCompleted,
          ),
          isComplete:
            existing.status === "completed" || existing.status === "dismissed",
        },
      };
    }

    // Create new record
    const [created] = await db
      .insert(onboardingProgress)
      .values({
        tenant_id: tenantId,
        status: "not_started",
        current_step: 1,
        steps_completed: {},
        step_data: {},
      })
      .returning();

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        ...created,
        percentComplete: 0,
        isComplete: false,
      },
    };
  } catch (error) {
    console.error("initializeOnboarding error:", error);
    return {
      success: false,
      error: "Failed to initialize onboarding",
    };
  }
}

/**
 * Start the onboarding wizard
 * Updates status to in_progress and sets started_at
 * AC 20.1.1: New Tenant Wizard Trigger
 */
export async function startOnboarding(): Promise<
  ActionResult<OnboardingProgress>
> {
  try {
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get or create progress record
    let progress = await db.query.onboardingProgress.findFirst();

    if (!progress) {
      const initResult = await initializeOnboarding();
      if (!initResult.success) {
        return initResult;
      }
      progress = initResult.data;
    }

    // Update to in_progress if not already started
    if (progress.status === "not_started") {
      const [updated] = await db
        .update(onboardingProgress)
        .set({
          status: "in_progress",
          started_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(onboardingProgress.tenant_id, tenantId))
        .returning();

      revalidatePath("/onboarding");
      revalidatePath("/dashboard");

      return {
        success: true,
        data: {
          ...updated,
          percentComplete: calculateProgress(
            updated.steps_completed as StepsCompleted,
          ),
          isComplete: false,
        },
      };
    }

    return {
      success: true,
      data: {
        ...progress,
        percentComplete: calculateProgress(
          progress.steps_completed as StepsCompleted,
        ),
        isComplete:
          progress.status === "completed" || progress.status === "dismissed",
      },
    };
  } catch (error) {
    console.error("startOnboarding error:", error);
    return {
      success: false,
      error: "Failed to start onboarding",
    };
  }
}

/**
 * Update onboarding step completion
 * AC 20.1.9: Skip and Return Later - persists progress
 */
export async function updateOnboardingStep(
  input: UpdateOnboardingStepInput,
): Promise<ActionResult<OnboardingProgress>> {
  try {
    const validated = updateOnboardingStepSchema.parse(input);
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const progress = await db.query.onboardingProgress.findFirst();
    if (!progress) {
      return {
        success: false,
        error: "Onboarding not initialized",
      };
    }

    const stepsCompleted = {
      ...(progress.steps_completed as StepsCompleted),
      [validated.stepNumber.toString()]: validated.completed,
    };

    const stepData = validated.stepData
      ? {
          ...(progress.step_data as StepData),
          [validated.stepNumber.toString()]: validated.stepData,
        }
      : progress.step_data;

    // Calculate next step
    const nextStep = Math.min(validated.stepNumber + 1, 5);

    const [updated] = await db
      .update(onboardingProgress)
      .set({
        steps_completed: stepsCompleted,
        step_data: stepData,
        current_step: nextStep,
        updated_at: new Date(),
      })
      .where(eq(onboardingProgress.tenant_id, tenantId))
      .returning();

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        ...updated,
        percentComplete: calculateProgress(stepsCompleted),
        isComplete: false,
      },
    };
  } catch (error) {
    console.error("updateOnboardingStep error:", error);
    return {
      success: false,
      error: "Failed to update onboarding step",
    };
  }
}

/**
 * Skip an onboarding step
 * AC 20.1.9: Skip and Return Later - skipped step is marked as skipped
 */
export async function skipOnboardingStep(
  stepNumber: number,
): Promise<ActionResult<OnboardingProgress>> {
  return updateOnboardingStep({
    stepNumber,
    completed: "skipped",
  });
}

/**
 * Complete onboarding
 * AC 20.1.10: Onboarding Completion
 */
export async function completeOnboarding(): Promise<
  ActionResult<OnboardingProgress>
> {
  try {
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const progress = await db.query.onboardingProgress.findFirst();
    if (!progress) {
      return {
        success: false,
        error: "Onboarding not initialized",
      };
    }

    const [updated] = await db
      .update(onboardingProgress)
      .set({
        status: "completed",
        completed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(onboardingProgress.tenant_id, tenantId))
      .returning();

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    revalidatePath("/welcome");

    return {
      success: true,
      data: {
        ...updated,
        percentComplete: 100,
        isComplete: true,
      },
    };
  } catch (error) {
    console.error("completeOnboarding error:", error);
    return {
      success: false,
      error: "Failed to complete onboarding",
    };
  }
}

/**
 * Dismiss onboarding permanently
 * AC 20.1.11: Dashboard Onboarding Widget - dismiss permanently
 */
export async function dismissOnboarding(): Promise<
  ActionResult<OnboardingProgress>
> {
  try {
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const progress = await db.query.onboardingProgress.findFirst();
    if (!progress) {
      return {
        success: false,
        error: "Onboarding not initialized",
      };
    }

    const [updated] = await db
      .update(onboardingProgress)
      .set({
        status: "dismissed",
        dismissed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(onboardingProgress.tenant_id, tenantId))
      .returning();

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    revalidatePath("/welcome");

    return {
      success: true,
      data: {
        ...updated,
        percentComplete: calculateProgress(
          updated.steps_completed as StepsCompleted,
        ),
        isComplete: true,
      },
    };
  } catch (error) {
    console.error("dismissOnboarding error:", error);
    return {
      success: false,
      error: "Failed to dismiss onboarding",
    };
  }
}

/**
 * Go to a specific step in the wizard
 * AC 20.1.9: Return to wizard - can revisit completed steps
 */
export async function goToStep(
  stepNumber: number,
): Promise<ActionResult<OnboardingProgress>> {
  try {
    if (stepNumber < 1 || stepNumber > 5) {
      return {
        success: false,
        error: "Invalid step number",
      };
    }

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const progress = await db.query.onboardingProgress.findFirst();
    if (!progress) {
      return {
        success: false,
        error: "Onboarding not initialized",
      };
    }

    const [updated] = await db
      .update(onboardingProgress)
      .set({
        current_step: stepNumber,
        updated_at: new Date(),
      })
      .where(eq(onboardingProgress.tenant_id, tenantId))
      .returning();

    revalidatePath("/onboarding");

    return {
      success: true,
      data: {
        ...updated,
        percentComplete: calculateProgress(
          updated.steps_completed as StepsCompleted,
        ),
        isComplete: false,
      },
    };
  } catch (error) {
    console.error("goToStep error:", error);
    return {
      success: false,
      error: "Failed to navigate to step",
    };
  }
}
