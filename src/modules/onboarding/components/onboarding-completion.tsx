"use client";

/**
 * Onboarding Completion Screen
 * Story 20.1: Build Onboarding Wizard
 * AC 20.1.10: Onboarding Completion
 *
 * Shows celebration animation, summary of created items,
 * and "Go to Dashboard" button
 */

import { CheckCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OnboardingCompletionSummary } from "../types";

interface OnboardingCompletionProps {
  /** Summary of what was completed during onboarding */
  summary: OnboardingCompletionSummary;
}

export function OnboardingCompletion({ summary }: OnboardingCompletionProps) {
  const router = useRouter();

  const completedItems = [
    {
      label: "Company Profile",
      completed: summary.companyConfigured,
      icon: "building",
    },
    {
      label: "Team Invitation",
      completed: summary.teamMemberInvited,
      icon: "users",
    },
    {
      label: summary.contactName
        ? `Contact: ${summary.contactName}`
        : "First Contact",
      completed: summary.contactCreated,
      icon: "user",
    },
    {
      label: summary.titleName ? `Title: ${summary.titleName}` : "First Title",
      completed: summary.titleCreated,
      icon: "book",
    },
    {
      label: summary.isbnPrefix
        ? `ISBN Prefix: ${summary.isbnPrefix}`
        : "ISBN Configuration",
      completed: summary.isbnConfigured,
      icon: "hash",
    },
  ];

  const completedCount = completedItems.filter((item) => item.completed).length;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 p-8">
      {/* Celebration Icon */}
      <div className="relative">
        <div className="absolute -inset-4 bg-green-100 rounded-full animate-pulse" />
        <div className="relative bg-green-500 text-white rounded-full p-6">
          <Sparkles className="h-12 w-12" />
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-green-700">You're All Set!</h1>
        <p className="text-muted-foreground max-w-md">
          Your publishing account is ready. You can now start managing your
          titles, authors, and royalties.
        </p>
      </div>

      {/* Completion Summary */}
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-4">
            Setup Summary ({completedCount} of 5 completed)
          </h3>
          <ul className="space-y-3">
            {completedItems.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                {item.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                )}
                <span
                  className={
                    item.completed ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <div className="text-center text-sm text-muted-foreground max-w-md">
        <p>
          You can always add more titles, contacts, and configure settings from
          the dashboard. Check out the help documentation for tips on getting
          the most out of Salina.
        </p>
      </div>

      {/* Go to Dashboard Button */}
      <Button
        size="lg"
        onClick={() => router.push("/dashboard")}
        className="min-w-[200px]"
      >
        Go to Dashboard
      </Button>
    </div>
  );
}

export default OnboardingCompletion;
