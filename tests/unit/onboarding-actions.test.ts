/**
 * @vitest-environment node
 *
 * Onboarding Actions Unit Tests
 *
 * Story 20.1 - AC 20.1.9: Skip and Return Later
 * Story 20.1 - AC 20.1.10: Onboarding Completion
 * Story 20.1 - AC 20.1.11: Dashboard Onboarding Widget
 *
 * Tests server actions for onboarding progress management.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies first
vi.mock("@/lib/auth", () => ({
  getCurrentTenantId: vi.fn().mockResolvedValue("tenant-uuid-123"),
  getDb: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock drizzle query builder
const mockOnboardingProgress = {
  id: "onboarding-uuid-123",
  tenant_id: "tenant-uuid-123",
  status: "in_progress",
  current_step: 1,
  steps_completed: {},
  step_data: {},
  started_at: new Date(),
  completed_at: null,
  dismissed_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockInsertReturning = vi.fn().mockResolvedValue([mockOnboardingProgress]);
const mockUpdateReturning = vi.fn().mockResolvedValue([mockOnboardingProgress]);
const mockUpdateWhere = vi
  .fn()
  .mockReturnValue({ returning: mockUpdateReturning });
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });

const mockDb = {
  query: {
    onboardingProgress: {
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: mockInsertReturning,
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: mockUpdateSet,
  }),
};

// Import after mocking
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/auth";
import {
  completeOnboarding,
  dismissOnboarding,
  goToStep,
  initializeOnboarding,
  skipOnboardingStep,
  startOnboarding,
  updateOnboardingStep,
} from "@/modules/onboarding/actions";

describe("Onboarding Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
    mockDb.query.onboardingProgress.findFirst.mockResolvedValue(null);
  });

  describe("initializeOnboarding", () => {
    it("creates new onboarding record if none exists", async () => {
      mockDb.query.onboardingProgress.findFirst.mockResolvedValue(null);
      mockInsertReturning.mockResolvedValue([
        {
          ...mockOnboardingProgress,
          status: "not_started",
          steps_completed: {},
        },
      ]);

      const result = await initializeOnboarding();

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/onboarding");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("returns existing record if already initialized", async () => {
      mockDb.query.onboardingProgress.findFirst.mockResolvedValue(
        mockOnboardingProgress,
      );

      const result = await initializeOnboarding();

      expect(result.success).toBe(true);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("startOnboarding", () => {
    it("updates status to in_progress for not_started records", async () => {
      mockDb.query.onboardingProgress.findFirst.mockResolvedValue({
        ...mockOnboardingProgress,
        status: "not_started",
      });
      mockUpdateReturning.mockResolvedValue([
        { ...mockOnboardingProgress, status: "in_progress" },
      ]);

      const result = await startOnboarding();

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("returns existing record if already in_progress", async () => {
      mockDb.query.onboardingProgress.findFirst.mockResolvedValue({
        ...mockOnboardingProgress,
        status: "in_progress",
      });

      const result = await startOnboarding();

      expect(result.success).toBe(true);
      expect(mockUpdateSet).not.toHaveBeenCalled();
    });
  });

  describe("updateOnboardingStep", () => {
    beforeEach(() => {
      mockDb.query.onboardingProgress.findFirst.mockResolvedValue(
        mockOnboardingProgress,
      );
    });

    it("marks step as completed", async () => {
      mockUpdateReturning.mockResolvedValue([
        { ...mockOnboardingProgress, steps_completed: { "1": true } },
      ]);

      const result = await updateOnboardingStep({
        stepNumber: 1,
        completed: true,
      });

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("saves step data when provided", async () => {
      mockUpdateReturning.mockResolvedValue([
        {
          ...mockOnboardingProgress,
          steps_completed: { "3": true },
          step_data: { "3": { contactName: "Test Author" } },
        },
      ]);

      const result = await updateOnboardingStep({
        stepNumber: 3,
        completed: true,
        stepData: { contactName: "Test Author" },
      });

      expect(result.success).toBe(true);
    });

    it("returns error if onboarding not initialized", async () => {
      mockDb.query.onboardingProgress.findFirst.mockResolvedValue(null);

      const result = await updateOnboardingStep({
        stepNumber: 1,
        completed: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Onboarding not initialized");
      }
    });
  });

  describe("skipOnboardingStep", () => {
    beforeEach(() => {
      mockDb.query.onboardingProgress.findFirst.mockResolvedValue(
        mockOnboardingProgress,
      );
    });

    it("marks step as skipped", async () => {
      mockUpdateReturning.mockResolvedValue([
        { ...mockOnboardingProgress, steps_completed: { "2": "skipped" } },
      ]);

      const result = await skipOnboardingStep(2);

      expect(result.success).toBe(true);
    });
  });

  describe("completeOnboarding", () => {
    beforeEach(() => {
      mockDb.query.onboardingProgress.findFirst.mockResolvedValue(
        mockOnboardingProgress,
      );
    });

    it("sets status to completed", async () => {
      mockUpdateReturning.mockResolvedValue([
        { ...mockOnboardingProgress, status: "completed" },
      ]);

      const result = await completeOnboarding();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isComplete).toBe(true);
      }
      expect(revalidatePath).toHaveBeenCalledWith("/welcome");
    });

    it("returns error if not initialized", async () => {
      mockDb.query.onboardingProgress.findFirst.mockResolvedValue(null);

      const result = await completeOnboarding();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Onboarding not initialized");
      }
    });
  });

  describe("dismissOnboarding", () => {
    beforeEach(() => {
      mockDb.query.onboardingProgress.findFirst.mockResolvedValue(
        mockOnboardingProgress,
      );
    });

    it("sets status to dismissed", async () => {
      mockUpdateReturning.mockResolvedValue([
        { ...mockOnboardingProgress, status: "dismissed" },
      ]);

      const result = await dismissOnboarding();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isComplete).toBe(true);
      }
    });
  });

  describe("goToStep", () => {
    beforeEach(() => {
      mockDb.query.onboardingProgress.findFirst.mockResolvedValue(
        mockOnboardingProgress,
      );
    });

    it("navigates to valid step", async () => {
      mockUpdateReturning.mockResolvedValue([
        { ...mockOnboardingProgress, current_step: 3 },
      ]);

      const result = await goToStep(3);

      expect(result.success).toBe(true);
    });

    it("rejects invalid step numbers", async () => {
      const result = await goToStep(6);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid step number");
      }
    });

    it("rejects step number below 1", async () => {
      const result = await goToStep(0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid step number");
      }
    });
  });
});
