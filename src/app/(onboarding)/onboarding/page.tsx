/**
 * Onboarding Wizard Page
 * Story 20.1: Build Onboarding Wizard
 * AC 20.1.1: New Tenant Wizard Trigger
 */

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { adminDb } from "@/db";
import { tenants } from "@/db/schema/tenants";
import { users } from "@/db/schema/users";
import { getContactsByRole } from "@/modules/contacts/queries";
import {
  initializeOnboarding,
  startOnboarding,
} from "@/modules/onboarding/actions";
import { OnboardingWizard } from "@/modules/onboarding/components/onboarding-wizard";
import { getOnboardingProgress } from "@/modules/onboarding/queries";
import type { StepsCompleted } from "@/modules/onboarding/types";

export default async function OnboardingPage() {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Get user and tenant
  const user = await adminDb.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
    with: { tenant: true },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const tenant = await adminDb.query.tenants.findFirst({
    where: eq(tenants.id, user.tenant_id),
  });

  if (!tenant) {
    redirect("/sign-in");
  }

  // Get or initialize onboarding progress
  let progress = await getOnboardingProgress();

  if (!progress) {
    const initResult = await initializeOnboarding();
    if (!initResult.success) {
      // If initialization fails, redirect to dashboard
      redirect("/dashboard");
    }
    progress = initResult.data;
  }

  // Start onboarding if not started yet
  if (progress.status === "not_started") {
    const startResult = await startOnboarding();
    if (startResult.success) {
      progress = startResult.data;
    }
  }

  // If already completed or dismissed, redirect to dashboard
  if (progress.status === "completed" || progress.status === "dismissed") {
    redirect("/dashboard");
  }

  // Fetch existing contacts with author role for Step 4
  const existingAuthors = await getContactsByRole("author");
  const authorOptions = existingAuthors.map((author) => ({
    id: author.id,
    name: `${author.first_name} ${author.last_name}`.trim(),
  }));

  return (
    <OnboardingWizard
      initialProgress={{
        ...progress,
        steps_completed: progress.steps_completed as StepsCompleted,
        percentComplete: progress.percentComplete,
        isComplete: progress.isComplete,
      }}
      tenantName={tenant.name}
      existingAuthors={authorOptions}
    />
  );
}
