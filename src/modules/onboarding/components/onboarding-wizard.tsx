"use client";

/**
 * Onboarding Wizard Main Component
 * Story 20.1: Build Onboarding Wizard
 *
 * Orchestrates the multi-step onboarding flow:
 * - Step navigation (back/next/skip)
 * - Progress persistence
 * - Step state management
 */

import { ArrowLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  completeOnboarding,
  goToStep,
  skipOnboardingStep,
  updateOnboardingStep,
} from "../actions";
import type { OnboardingProgress, StepsCompleted } from "../types";
import { OnboardingCompletion } from "./onboarding-completion";
import { OnboardingProgress as ProgressIndicator } from "./onboarding-progress";
import { StepAddContact } from "./step-add-contact";
import { StepCompanyProfile } from "./step-company-profile";
import { StepConfigureIsbn } from "./step-configure-isbn";
import { StepCreateTitle } from "./step-create-title";
import { StepInviteTeam } from "./step-invite-team";

interface Author {
  id: string;
  name: string;
}

interface OnboardingWizardProps {
  /** Initial progress from database */
  initialProgress: OnboardingProgress;
  /** Tenant name for welcome */
  tenantName?: string;
  /** Existing authors from database for Step 4 */
  existingAuthors?: Author[];
}

interface CreatedItems {
  contactId?: string;
  contactName?: string;
  titleId?: string;
  titleName?: string;
  titleFormat?: string;
  isbnPrefix?: string;
}

export function OnboardingWizard({
  initialProgress,
  tenantName = "Your Company",
  existingAuthors = [],
}: OnboardingWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State
  const [currentStep, setCurrentStep] = useState(initialProgress.current_step);
  const [stepsCompleted, setStepsCompleted] = useState<StepsCompleted>(
    (initialProgress.steps_completed as StepsCompleted) || {},
  );
  const [percentComplete, setPercentComplete] = useState(
    initialProgress.percentComplete,
  );
  const [isComplete, setIsComplete] = useState(false);
  const [createdItems, setCreatedItems] = useState<CreatedItems>({});
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Calculate progress
  const calculateProgress = useCallback((completed: StepsCompleted) => {
    // Only Step 1 is required
    return completed["1"] === true ? 100 : 0;
  }, []);

  // Handle step completion
  const handleStepComplete = useCallback(
    (stepNumber: number, stepData?: Record<string, unknown>) => {
      startTransition(async () => {
        const result = await updateOnboardingStep({
          stepNumber,
          completed: true,
          stepData,
        });

        if (result.success) {
          const newCompleted = {
            ...stepsCompleted,
            [stepNumber.toString()]: true as const,
          };
          setStepsCompleted(newCompleted);
          setPercentComplete(calculateProgress(newCompleted));

          // Move to next step or complete
          if (stepNumber >= 5) {
            await completeOnboarding();
            setIsComplete(true);
          } else {
            setCurrentStep(stepNumber + 1);
          }
        }
      });
    },
    [stepsCompleted, calculateProgress],
  );

  // Handle step skip
  const handleStepSkip = useCallback(
    (stepNumber: number) => {
      startTransition(async () => {
        const result = await skipOnboardingStep(stepNumber);

        if (result.success) {
          const newCompleted = {
            ...stepsCompleted,
            [stepNumber.toString()]: "skipped" as const,
          };
          setStepsCompleted(newCompleted);

          // Move to next step or complete
          if (stepNumber >= 5) {
            await completeOnboarding();
            setIsComplete(true);
          } else {
            setCurrentStep(stepNumber + 1);
          }
        }
      });
    },
    [stepsCompleted],
  );

  // Handle going back
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      startTransition(async () => {
        await goToStep(currentStep - 1);
        setCurrentStep(currentStep - 1);
      });
    }
  }, [currentStep]);

  // Handle step click (for revisiting completed steps)
  const handleStepClick = useCallback(
    (stepNumber: number) => {
      const stepStatus = stepsCompleted[stepNumber.toString()];
      if (stepStatus === true || stepStatus === "skipped") {
        startTransition(async () => {
          await goToStep(stepNumber);
          setCurrentStep(stepNumber);
        });
      }
    },
    [stepsCompleted],
  );

  // Handle exit/close
  const handleExit = useCallback(() => {
    setShowExitDialog(true);
  }, []);

  const confirmExit = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  // Step 3 completion with contact data
  const handleContactComplete = useCallback(
    (contactId: string, contactName: string) => {
      setCreatedItems((prev) => ({ ...prev, contactId, contactName }));
      handleStepComplete(3, { contactId, contactName });
    },
    [handleStepComplete],
  );

  // Step 4 completion with title data
  const handleTitleComplete = useCallback(
    (titleId: string, titleName: string, format: string) => {
      setCreatedItems((prev) => ({
        ...prev,
        titleId,
        titleName,
        titleFormat: format,
      }));
      handleStepComplete(4, { titleId, titleName, titleFormat: format });
    },
    [handleStepComplete],
  );

  // Step 5 completion with ISBN data
  const handleIsbnComplete = useCallback(
    (isbnPrefix: string) => {
      setCreatedItems((prev) => ({ ...prev, isbnPrefix }));
      handleStepComplete(5, { isbnPrefix });
    },
    [handleStepComplete],
  );

  // Show completion screen
  if (isComplete) {
    return (
      <OnboardingCompletion
        summary={{
          companyConfigured: stepsCompleted["1"] === true,
          teamMemberInvited: stepsCompleted["2"] === true,
          contactCreated: stepsCompleted["3"] === true,
          contactName: createdItems.contactName,
          titleCreated: stepsCompleted["4"] === true,
          titleName: createdItems.titleName,
          isbnConfigured: stepsCompleted["5"] === true,
          isbnPrefix: createdItems.isbnPrefix,
        }}
      />
    );
  }

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepCompanyProfile
            companyName={tenantName}
            onComplete={(companyName) => handleStepComplete(1, { companyName })}
          />
        );
      case 2:
        return (
          <StepInviteTeam
            onComplete={() => handleStepComplete(2)}
            onSkip={() => handleStepSkip(2)}
          />
        );
      case 3:
        return (
          <StepAddContact
            onComplete={handleContactComplete}
            onSkip={() => handleStepSkip(3)}
          />
        );
      case 4: {
        // Combine existing authors with newly created contact from Step 3
        const allAuthors = [...existingAuthors];
        if (createdItems.contactId && createdItems.contactName) {
          // Add newly created contact if not already in the list
          const exists = allAuthors.some(
            (a) => a.id === createdItems.contactId,
          );
          if (!exists) {
            allAuthors.unshift({
              id: createdItems.contactId,
              name: createdItems.contactName,
            });
          }
        }
        return (
          <StepCreateTitle
            authors={allAuthors}
            onComplete={handleTitleComplete}
            onSkip={() => handleStepSkip(4)}
          />
        );
      }
      case 5:
        return (
          <StepConfigureIsbn
            onComplete={handleIsbnComplete}
            onSkip={() => handleStepSkip(5)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish Later?</DialogTitle>
            <DialogDescription>
              Your progress has been saved. You can return to complete the setup
              anytime from your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              Continue Setup
            </Button>
            <Button onClick={confirmExit}>Go to Dashboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Wizard Layout */}
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentStep > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  disabled={isPending}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h1 className="text-2xl font-bold">Welcome to Salina</h1>
            </div>
            <Button variant="ghost" onClick={handleExit} className="gap-2">
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Finish Later</span>
            </Button>
          </div>

          {/* Progress Indicator */}
          <ProgressIndicator
            currentStep={currentStep}
            stepsCompleted={stepsCompleted}
            percentComplete={percentComplete}
            onStepClick={handleStepClick}
          />

          {/* Step Content */}
          <Card>
            <CardContent className="pt-6">{renderStep()}</CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export default OnboardingWizard;
