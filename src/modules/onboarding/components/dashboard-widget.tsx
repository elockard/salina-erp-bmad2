"use client";

/**
 * Dashboard Onboarding Widget
 * Story 20.1: Build Onboarding Wizard
 * AC 20.1.11: Dashboard Onboarding Widget
 *
 * Shows progress and "Continue Setup" button for incomplete onboarding
 */

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dismissOnboarding } from "../actions";
import type { StepsCompleted } from "../types";
import { ONBOARDING_STEPS } from "../types";
import { OnboardingProgress } from "./onboarding-progress";

interface DashboardWidgetProps {
  /** Current step number */
  currentStep: number;
  /** Steps completion record */
  stepsCompleted: StepsCompleted;
  /** Overall percentage complete */
  percentComplete: number;
}

export function DashboardWidget({
  currentStep,
  stepsCompleted,
  percentComplete,
}: DashboardWidgetProps) {
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Get remaining steps
  const remainingSteps = ONBOARDING_STEPS.filter((step) => {
    const status = stepsCompleted[step.number.toString()];
    return status !== true && status !== "skipped";
  });

  const handleDismiss = () => {
    startTransition(async () => {
      const result = await dismissOnboarding();
      if (result.success) {
        setIsDismissed(true);
      }
      setShowDismissDialog(false);
    });
  };

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  return (
    <>
      {/* Dismiss Confirmation Dialog */}
      <AlertDialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss Setup Guide?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the onboarding widget permanently. You can still
              access all features from the main navigation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDismiss} disabled={isPending}>
              {isPending ? "Dismissing..." : "Dismiss"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Widget Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Complete Your Setup</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setShowDismissDialog(true)}
              aria-label="Dismiss setup guide"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Compact Progress */}
          <OnboardingProgress
            currentStep={currentStep}
            stepsCompleted={stepsCompleted}
            percentComplete={percentComplete}
            compact
          />

          {/* Remaining Steps */}
          {remainingSteps.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Remaining steps:
              </p>
              <ul className="text-sm space-y-0.5">
                {remainingSteps.slice(0, 3).map((step) => (
                  <li key={step.number} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">
                      {step.number}
                    </span>
                    <span>{step.name}</span>
                    {!step.required && (
                      <span className="text-xs text-muted-foreground">
                        (optional)
                      </span>
                    )}
                  </li>
                ))}
                {remainingSteps.length > 3 && (
                  <li className="text-xs text-muted-foreground pl-7">
                    +{remainingSteps.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Continue Button */}
          <Button asChild className="w-full">
            <Link href="/onboarding">
              Continue Setup
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export default DashboardWidget;
