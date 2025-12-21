"use client";

/**
 * Author Milestone Preferences Component
 *
 * Displays toggle switches for production milestone notification preferences.
 * Auto-saves on toggle change with optimistic updates.
 *
 * Story: 21.4 - Receive Production Milestone Notifications
 * AC-21.4.3: Configure which production stages trigger notifications
 */

import {
  Bell,
  Check,
  Edit3,
  Layout,
  Mail,
  Package,
  Printer,
} from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  type AuthorMilestonePreferences as MilestonePrefs,
  type UpdateMilestonePreferencesInput,
  updateMilestonePreferences,
} from "@/modules/author-notifications";

interface AuthorMilestonePreferencesProps {
  preferences: MilestonePrefs;
}

/**
 * Stage configuration for display
 */
const STAGE_CONFIG = [
  {
    key: "notifyEditing" as const,
    label: "Editing",
    description: "When editing begins",
    icon: Edit3,
  },
  {
    key: "notifyDesign" as const,
    label: "Design",
    description: "When design phase starts",
    icon: Layout,
  },
  {
    key: "notifyProof" as const,
    label: "Proofing",
    description: "When proofs are ready",
    icon: Printer,
  },
  {
    key: "notifyPrintReady" as const,
    label: "Print Ready",
    description: "When approved for printing",
    icon: Package,
  },
  {
    key: "notifyComplete" as const,
    label: "Complete",
    description: "When production is finished",
    icon: Check,
  },
];

export function AuthorMilestonePreferences({
  preferences: initialPreferences,
}: AuthorMilestonePreferencesProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticPrefs, setOptimisticPrefs] =
    useOptimistic(initialPreferences);

  async function handleToggle(
    key: keyof UpdateMilestonePreferencesInput,
    value: boolean,
  ) {
    // Optimistic update
    setOptimisticPrefs((prev) => ({
      ...prev,
      [key]: value,
    }));

    startTransition(async () => {
      const result = await updateMilestonePreferences({ [key]: value });

      if (!result.success) {
        // Revert on failure
        setOptimisticPrefs((prev) => ({
          ...prev,
          [key]: !value,
        }));
        toast.error("Failed to save preference");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Production Milestone Notifications
        </CardTitle>
        <CardDescription>
          Choose which production stages you want to be notified about
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Master Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="email-toggle" className="text-base font-medium">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications in addition to in-app alerts
              </p>
            </div>
          </div>
          <Switch
            id="email-toggle"
            checked={optimisticPrefs.emailEnabled}
            onCheckedChange={(checked) => handleToggle("emailEnabled", checked)}
            disabled={isPending}
          />
        </div>

        <Separator />

        {/* Stage Toggles */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            Notify me when my book reaches:
          </h4>

          <div className="space-y-3">
            {STAGE_CONFIG.map((stage) => {
              const Icon = stage.icon;
              const isEnabled = optimisticPrefs[stage.key];

              return (
                <div
                  key={stage.key}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor={stage.key}
                        className="text-sm font-medium"
                      >
                        {stage.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={stage.key}
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      handleToggle(stage.key, checked)
                    }
                    disabled={isPending}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Saving indicator */}
        {isPending && (
          <p className="text-sm text-muted-foreground text-center">Saving...</p>
        )}
      </CardContent>
    </Card>
  );
}
