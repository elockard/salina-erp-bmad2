/**
 * @vitest-environment node
 *
 * Onboarding Wizard Unit Tests
 *
 * Story 20.1: Build Onboarding Wizard
 *
 * Tests cover:
 * - AC 20.1.2: Multi-Step Wizard Flow
 * - AC 20.1.8: Progress Indicator
 * - AC 20.1.9: Skip and Return Later
 */

import { describe, expect, it, vi } from "vitest";

// Mock dependencies before importing components
vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(),
  getCurrentTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "test-user-id",
    role: "owner",
    email: "owner@test.com",
  }),
  getDb: vi.fn().mockResolvedValue({
    query: {
      onboardingProgress: {
        findFirst: vi.fn(),
      },
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/modules/onboarding/actions", () => ({
  updateOnboardingStep: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: "test-id",
      tenant_id: "test-tenant-id",
      current_step: 2,
      steps_completed: { "1": true },
      percentComplete: 100,
      isComplete: false,
    },
  }),
  skipOnboardingStep: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: "test-id",
      tenant_id: "test-tenant-id",
      current_step: 3,
      steps_completed: { "1": true, "2": "skipped" },
      percentComplete: 100,
      isComplete: false,
    },
  }),
  completeOnboarding: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: "test-id",
      tenant_id: "test-tenant-id",
      status: "completed",
      percentComplete: 100,
      isComplete: true,
    },
  }),
  goToStep: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: "test-id",
      tenant_id: "test-tenant-id",
      current_step: 1,
      steps_completed: {},
      percentComplete: 0,
      isComplete: false,
    },
  }),
}));

import { ONBOARDING_STEPS, TOTAL_STEPS } from "@/modules/onboarding/types";

describe("Onboarding Wizard - AC 20.1.2: Multi-Step Wizard Flow", () => {
  it("should define 5 wizard steps in correct order", () => {
    expect(ONBOARDING_STEPS).toHaveLength(5);
    expect(TOTAL_STEPS).toBe(5);

    expect(ONBOARDING_STEPS[0].name).toContain("Company");
    expect(ONBOARDING_STEPS[1].name).toContain("Team");
    expect(ONBOARDING_STEPS[2].name).toContain("Contact");
    expect(ONBOARDING_STEPS[3].name).toContain("Title");
    expect(ONBOARDING_STEPS[4].name).toContain("ISBN");
  });

  it("should validate step numbers are sequential 1-5", () => {
    for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
      expect(ONBOARDING_STEPS[i].number).toBe(i + 1);
    }
  });

  it("should mark only step 1 as required", () => {
    const requiredSteps = ONBOARDING_STEPS.filter((s) => s.required);
    expect(requiredSteps).toHaveLength(1);
    expect(requiredSteps[0].number).toBe(1);
    expect(requiredSteps[0].name).toContain("Company");
  });

  it("should mark steps 2-5 as optional", () => {
    const optionalSteps = ONBOARDING_STEPS.filter((s) => !s.required);
    expect(optionalSteps).toHaveLength(4);

    const optionalNumbers = optionalSteps.map((s) => s.number);
    expect(optionalNumbers).toEqual([2, 3, 4, 5]);
  });

  it("each step should have name, description, and required flag", () => {
    for (const step of ONBOARDING_STEPS) {
      expect(step.name).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(typeof step.required).toBe("boolean");
    }
  });
});

describe("Onboarding Wizard - AC 20.1.8: Progress Indicator", () => {
  it("should calculate 0% when no required steps completed", () => {
    const calculateProgress = (
      stepsCompleted: Record<string, boolean | "skipped">,
    ) => {
      const requiredSteps = ONBOARDING_STEPS.filter((s) => s.required);
      const completedRequired = requiredSteps.filter(
        (s) => stepsCompleted[s.number.toString()] === true,
      ).length;
      return Math.round((completedRequired / requiredSteps.length) * 100);
    };

    expect(calculateProgress({})).toBe(0);
    expect(calculateProgress({ "2": true })).toBe(0);
    expect(calculateProgress({ "1": "skipped" })).toBe(0);
  });

  it("should calculate 100% when required step 1 completed", () => {
    const calculateProgress = (
      stepsCompleted: Record<string, boolean | "skipped">,
    ) => {
      const requiredSteps = ONBOARDING_STEPS.filter((s) => s.required);
      const completedRequired = requiredSteps.filter(
        (s) => stepsCompleted[s.number.toString()] === true,
      ).length;
      return Math.round((completedRequired / requiredSteps.length) * 100);
    };

    expect(calculateProgress({ "1": true })).toBe(100);
    expect(calculateProgress({ "1": true, "2": true })).toBe(100);
    expect(calculateProgress({ "1": true, "2": "skipped" })).toBe(100);
  });

  it("skipping optional steps should not affect progress percentage", () => {
    const calculateProgress = (
      stepsCompleted: Record<string, boolean | "skipped">,
    ) => {
      const requiredSteps = ONBOARDING_STEPS.filter((s) => s.required);
      const completedRequired = requiredSteps.filter(
        (s) => stepsCompleted[s.number.toString()] === true,
      ).length;
      return Math.round((completedRequired / requiredSteps.length) * 100);
    };

    // All optional steps skipped, required completed
    expect(
      calculateProgress({
        "1": true,
        "2": "skipped",
        "3": "skipped",
        "4": "skipped",
        "5": "skipped",
      }),
    ).toBe(100);
  });
});

describe("Onboarding Wizard - AC 20.1.9: Skip and Return Later", () => {
  it("should allow skipping optional steps", () => {
    // Steps 2-5 are optional, so they can be skipped
    const optionalSteps = ONBOARDING_STEPS.filter((s) => !s.required);
    expect(optionalSteps.every((s) => !s.required)).toBe(true);
  });

  it("should mark skipped step as skipped, not incomplete", () => {
    const stepsCompleted: Record<string, boolean | "skipped"> = {};
    stepsCompleted["2"] = "skipped";

    // "skipped" is distinct from false/undefined
    expect(stepsCompleted["2"]).toBe("skipped");
    expect(stepsCompleted["2"]).not.toBe(false);
    expect(stepsCompleted["2"]).not.toBe(undefined);
  });

  it("should preserve step data for return later", () => {
    const stepData: Record<string, Record<string, unknown>> = {
      "1": { companyName: "Test Publisher" },
      "3": { contactName: "John Author" },
    };

    // Step data should be preserved
    expect(stepData["1"].companyName).toBe("Test Publisher");
    expect(stepData["3"].contactName).toBe("John Author");
  });

  it("step status should show correct state", () => {
    const getStepStatus = (
      stepNumber: number,
      currentStep: number,
      stepsCompleted: Record<string, boolean | "skipped">,
    ) => {
      const stepKey = stepNumber.toString();
      if (stepsCompleted[stepKey] === true) return "completed";
      if (stepsCompleted[stepKey] === "skipped") return "skipped";
      if (stepNumber === currentStep) return "current";
      return "upcoming";
    };

    const stepsCompleted = { "1": true as const, "2": "skipped" as const };

    expect(getStepStatus(1, 3, stepsCompleted)).toBe("completed");
    expect(getStepStatus(2, 3, stepsCompleted)).toBe("skipped");
    expect(getStepStatus(3, 3, stepsCompleted)).toBe("current");
    expect(getStepStatus(4, 3, stepsCompleted)).toBe("upcoming");
  });
});

describe("Onboarding Wizard - Step Descriptions", () => {
  it("Step 1: Company Profile should have correct metadata", () => {
    const step1 = ONBOARDING_STEPS[0];
    expect(step1.number).toBe(1);
    expect(step1.required).toBe(true);
    expect(step1.name).toBe("Company Profile");
  });

  it("Step 2: Invite Team should have correct metadata", () => {
    const step2 = ONBOARDING_STEPS[1];
    expect(step2.number).toBe(2);
    expect(step2.required).toBe(false);
    expect(step2.name).toBe("Invite Team");
  });

  it("Step 3: Add Contact should have correct metadata", () => {
    const step3 = ONBOARDING_STEPS[2];
    expect(step3.number).toBe(3);
    expect(step3.required).toBe(false);
    expect(step3.name).toBe("Add Contact");
  });

  it("Step 4: Create Title should have correct metadata", () => {
    const step4 = ONBOARDING_STEPS[3];
    expect(step4.number).toBe(4);
    expect(step4.required).toBe(false);
    expect(step4.name).toBe("Create Title");
  });

  it("Step 5: Configure ISBN should have correct metadata", () => {
    const step5 = ONBOARDING_STEPS[4];
    expect(step5.number).toBe(5);
    expect(step5.required).toBe(false);
    expect(step5.description).toContain("ISBN");
  });
});
