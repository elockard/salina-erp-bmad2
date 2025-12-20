"use client";

/**
 * Onboarding Widget Wrapper for Dashboard
 * Story 20.1: Build Onboarding Wizard
 * AC 20.1.11: Dashboard Onboarding Widget
 *
 * This is a client component wrapper that renders the DashboardWidget
 * on the server-rendered dashboard page.
 */

import { DashboardWidget } from "@/modules/onboarding/components/dashboard-widget";
import type { StepsCompleted } from "@/modules/onboarding/types";

interface OnboardingWidgetWrapperProps {
  currentStep: number;
  stepsCompleted: StepsCompleted;
  percentComplete: number;
}

export function OnboardingWidgetWrapper({
  currentStep,
  stepsCompleted,
  percentComplete,
}: OnboardingWidgetWrapperProps) {
  return (
    <div className="mb-6">
      <DashboardWidget
        currentStep={currentStep}
        stepsCompleted={stepsCompleted}
        percentComplete={percentComplete}
      />
    </div>
  );
}
