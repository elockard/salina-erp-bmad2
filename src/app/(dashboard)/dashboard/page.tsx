import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardStats } from "@/modules/dashboard/actions";
import {
  getOnboardingProgress,
  shouldShowOnboardingWidget,
} from "@/modules/onboarding/queries";
import type { StepsCompleted } from "@/modules/onboarding/types";
import { EditorDashboard } from "./components/editor-dashboard";
import { FinanceDashboard } from "./components/finance-dashboard";
import { OnboardingWidgetWrapper } from "./components/onboarding-widget-wrapper";
import { OwnerAdminDashboard } from "./components/owner-admin-dashboard";

export const metadata = {
  title: "Dashboard - Salina ERP",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Author redirect to portal
  if (user.role === "author") {
    redirect("/portal");
  }

  // Fetch role-specific stats and onboarding progress in parallel
  const [statsResult, showWidget, onboardingProgress] = await Promise.all([
    getDashboardStats(),
    shouldShowOnboardingWidget(),
    getOnboardingProgress(),
  ]);

  if (!statsResult.success) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Error loading dashboard</h2>
          <p className="text-sm text-muted-foreground">{statsResult.error}</p>
        </div>
      </div>
    );
  }

  const stats = statsResult.data.stats;
  const isbnStats = statsResult.data.isbnStats;

  // Onboarding widget (shown at top for incomplete onboarding)
  const onboardingWidget =
    showWidget && onboardingProgress ? (
      <OnboardingWidgetWrapper
        currentStep={onboardingProgress.current_step}
        stepsCompleted={onboardingProgress.steps_completed as StepsCompleted}
        percentComplete={onboardingProgress.percentComplete}
      />
    ) : null;

  // Render role-appropriate dashboard
  switch (user.role) {
    case "owner":
    case "admin":
      return (
        <>
          {onboardingWidget}
          <OwnerAdminDashboard
            stats={stats}
            user={user}
            isbnStats={isbnStats}
          />
        </>
      );
    case "editor":
      return (
        <>
          {onboardingWidget}
          <EditorDashboard stats={stats} user={user} isbnStats={isbnStats} />
        </>
      );
    case "finance":
      return (
        <>
          {onboardingWidget}
          <FinanceDashboard stats={stats} user={user} isbnStats={isbnStats} />
        </>
      );
    default:
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Unknown role</h2>
            <p className="text-sm text-muted-foreground">
              Your role "{user.role}" is not recognized.
            </p>
          </div>
        </div>
      );
  }
}
