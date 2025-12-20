/**
 * @vitest-environment node
 *
 * Onboarding Progress Calculation Tests
 *
 * Story 20.1 - AC 20.1.8: Progress Indicator
 *
 * Tests progress calculation logic and step status determination.
 */

import { describe, expect, it } from "vitest";

import {
  calculateProgress,
  getStepStatus,
  getStepsWithStatus,
} from "@/modules/onboarding/queries";
import { ONBOARDING_STEPS } from "@/modules/onboarding/types";

describe("Onboarding Progress Calculations", () => {
  describe("calculateProgress", () => {
    it("returns 0% when no steps completed", () => {
      const stepsCompleted = {};
      expect(calculateProgress(stepsCompleted)).toBe(0);
    });

    it("returns 100% when all required steps completed", () => {
      // Step 1 (Company Profile) is the only required step
      const stepsCompleted = { "1": true as const };
      expect(calculateProgress(stepsCompleted)).toBe(100);
    });

    it("does not count skipped required steps", () => {
      const stepsCompleted = { "1": "skipped" as const };
      expect(calculateProgress(stepsCompleted)).toBe(0);
    });

    it("ignores optional steps in progress calculation", () => {
      // Steps 2-5 are optional, so completing them without step 1 = 0%
      const stepsCompleted = {
        "2": true as const,
        "3": true as const,
        "4": true as const,
        "5": true as const,
      };
      expect(calculateProgress(stepsCompleted)).toBe(0);
    });

    it("calculates correctly with mix of completed and skipped", () => {
      const stepsCompleted = {
        "1": true as const,
        "2": "skipped" as const,
        "3": true as const,
      };
      // Only required step (1) is completed = 100%
      expect(calculateProgress(stepsCompleted)).toBe(100);
    });
  });

  describe("getStepStatus", () => {
    it("returns completed for completed steps", () => {
      const stepsCompleted = { "1": true as const };
      expect(getStepStatus(1, 2, stepsCompleted)).toBe("completed");
    });

    it("returns skipped for skipped steps", () => {
      const stepsCompleted = { "2": "skipped" as const };
      expect(getStepStatus(2, 3, stepsCompleted)).toBe("skipped");
    });

    it("returns current for current step", () => {
      const stepsCompleted = { "1": true as const };
      expect(getStepStatus(2, 2, stepsCompleted)).toBe("current");
    });

    it("returns upcoming for future steps", () => {
      const stepsCompleted = {};
      expect(getStepStatus(3, 1, stepsCompleted)).toBe("upcoming");
    });

    it("prioritizes completed over current", () => {
      // If step is both completed and current (edge case), completed wins
      const stepsCompleted = { "1": true as const };
      expect(getStepStatus(1, 1, stepsCompleted)).toBe("completed");
    });
  });

  describe("getStepsWithStatus", () => {
    it("returns all steps with correct status", () => {
      const stepsCompleted = { "1": true as const, "2": "skipped" as const };
      const currentStep = 3;

      const result = getStepsWithStatus(currentStep, stepsCompleted);

      expect(result).toHaveLength(ONBOARDING_STEPS.length);
      expect(result[0].status).toBe("completed"); // Step 1
      expect(result[1].status).toBe("skipped"); // Step 2
      expect(result[2].status).toBe("current"); // Step 3
      expect(result[3].status).toBe("upcoming"); // Step 4
      expect(result[4].status).toBe("upcoming"); // Step 5
    });

    it("includes all step metadata", () => {
      const result = getStepsWithStatus(1, {});

      expect(result[0]).toMatchObject({
        number: 1,
        name: expect.any(String),
        description: expect.any(String),
        required: true,
        status: "current",
      });
    });

    it("marks only step 1 as required", () => {
      const result = getStepsWithStatus(1, {});

      const requiredSteps = result.filter((s) => s.required);
      expect(requiredSteps).toHaveLength(1);
      expect(requiredSteps[0].number).toBe(1);
    });
  });

  describe("ONBOARDING_STEPS constant", () => {
    it("has 5 steps defined", () => {
      expect(ONBOARDING_STEPS).toHaveLength(5);
    });

    it("steps are numbered 1-5", () => {
      const numbers = ONBOARDING_STEPS.map((s) => s.number);
      expect(numbers).toEqual([1, 2, 3, 4, 5]);
    });

    it("each step has required metadata", () => {
      for (const step of ONBOARDING_STEPS) {
        expect(step).toHaveProperty("number");
        expect(step).toHaveProperty("name");
        expect(step).toHaveProperty("description");
        expect(step).toHaveProperty("required");
      }
    });

    it("step names are descriptive", () => {
      expect(ONBOARDING_STEPS[0].name).toContain("Company");
      expect(ONBOARDING_STEPS[1].name).toContain("Team");
      expect(ONBOARDING_STEPS[2].name).toContain("Contact");
      expect(ONBOARDING_STEPS[3].name).toContain("Title");
      expect(ONBOARDING_STEPS[4].name).toContain("ISBN");
    });
  });
});
