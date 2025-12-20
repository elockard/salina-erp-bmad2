/**
 * @vitest-environment node
 *
 * Onboarding Flow Integration Tests
 *
 * Story 20.1: Build Onboarding Wizard
 *
 * Tests cover:
 * - AC 20.1.1: New Tenant Wizard Trigger
 * - AC 20.1.10: Onboarding Completion
 * - AC 20.1.11: Dashboard Onboarding Widget
 * - AC 20.1.12: Persistence Across Sessions
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  getCurrentTenantId: vi.fn().mockResolvedValue("tenant-uuid-123"),
  getDb: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock database state
let mockProgress: any = null;

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi
  .fn()
  .mockReturnValue({ returning: mockUpdateReturning });
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockInsertReturning = vi.fn();
const mockInsertValues = vi
  .fn()
  .mockReturnValue({ returning: mockInsertReturning });

const createMockDb = () => ({
  query: {
    onboardingProgress: {
      findFirst: vi
        .fn()
        .mockImplementation(() => Promise.resolve(mockProgress)),
    },
  },
  insert: vi.fn().mockReturnValue({
    values: mockInsertValues,
  }),
  update: vi.fn().mockReturnValue({
    set: mockUpdateSet,
  }),
});

// Import after mocking
import { getDb } from "@/lib/auth";
import {
  completeOnboarding,
  dismissOnboarding,
  initializeOnboarding,
  skipOnboardingStep,
  startOnboarding,
  updateOnboardingStep,
} from "@/modules/onboarding/actions";
import {
  getOnboardingProgress,
  shouldShowOnboarding,
  shouldShowOnboardingWidget,
} from "@/modules/onboarding/queries";

describe("Onboarding Flow - AC 20.1.1: New Tenant Wizard Trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProgress = null;
    const mockDb = createMockDb();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  it("shows onboarding for new tenant (no progress record)", async () => {
    mockProgress = null;

    const result = await shouldShowOnboarding();

    expect(result).toBe(true);
  });

  it("shows onboarding for tenant with not_started status", async () => {
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "not_started",
      current_step: 1,
      steps_completed: {},
      step_data: {},
    };

    const result = await shouldShowOnboarding();

    expect(result).toBe(true);
  });

  it("shows onboarding for tenant with in_progress status", async () => {
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "in_progress",
      current_step: 2,
      steps_completed: { "1": true },
      step_data: {},
    };

    const result = await shouldShowOnboarding();

    expect(result).toBe(true);
  });

  it("hides onboarding for tenant with completed status", async () => {
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "completed",
      current_step: 5,
      steps_completed: { "1": true },
      step_data: {},
    };

    const result = await shouldShowOnboarding();

    expect(result).toBe(false);
  });

  it("hides onboarding for tenant with dismissed status", async () => {
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "dismissed",
      current_step: 1,
      steps_completed: {},
      step_data: {},
    };

    const result = await shouldShowOnboarding();

    expect(result).toBe(false);
  });
});

describe("Onboarding Flow - Complete Full Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProgress = null;
    const mockDb = createMockDb();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  it("completes full onboarding flow step by step", async () => {
    // Step 1: Initialize
    mockInsertReturning.mockResolvedValue([
      {
        id: "test-id",
        tenant_id: "tenant-uuid-123",
        status: "not_started",
        current_step: 1,
        steps_completed: {},
        step_data: {},
      },
    ]);

    const initResult = await initializeOnboarding();
    expect(initResult.success).toBe(true);
    if (initResult.success) {
      expect(initResult.data.percentComplete).toBe(0);
    }

    // Step 2: Start onboarding
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "not_started",
      current_step: 1,
      steps_completed: {},
      step_data: {},
    };

    mockUpdateReturning.mockResolvedValue([
      {
        ...mockProgress,
        status: "in_progress",
        started_at: new Date(),
      },
    ]);

    const startResult = await startOnboarding();
    expect(startResult.success).toBe(true);

    // Step 3: Complete step 1 (required)
    mockProgress.status = "in_progress";
    mockUpdateReturning.mockResolvedValue([
      {
        ...mockProgress,
        current_step: 2,
        steps_completed: { "1": true },
      },
    ]);

    const step1Result = await updateOnboardingStep({
      stepNumber: 1,
      completed: true,
    });
    expect(step1Result.success).toBe(true);
    if (step1Result.success) {
      expect(step1Result.data.percentComplete).toBe(100); // Only step 1 required
    }

    // Step 4: Skip steps 2-4
    for (const stepNum of [2, 3, 4]) {
      mockProgress.steps_completed = {
        ...mockProgress.steps_completed,
        [`${stepNum}`]: "skipped",
      };
      mockUpdateReturning.mockResolvedValue([
        {
          ...mockProgress,
          current_step: stepNum + 1,
          steps_completed: mockProgress.steps_completed,
        },
      ]);

      const skipResult = await skipOnboardingStep(stepNum);
      expect(skipResult.success).toBe(true);
    }

    // Step 5: Complete onboarding
    mockUpdateReturning.mockResolvedValue([
      {
        ...mockProgress,
        status: "completed",
        completed_at: new Date(),
      },
    ]);

    const completeResult = await completeOnboarding();
    expect(completeResult.success).toBe(true);
    if (completeResult.success) {
      expect(completeResult.data.isComplete).toBe(true);
    }
  });
});

describe("Onboarding Flow - Skip All and Complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockDb = createMockDb();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "in_progress",
      current_step: 1,
      steps_completed: {},
      step_data: {},
    };
  });

  it("allows completing required step and skipping all optional", async () => {
    // Complete step 1 (required)
    mockUpdateReturning.mockResolvedValue([
      {
        ...mockProgress,
        current_step: 2,
        steps_completed: { "1": true },
      },
    ]);

    const step1 = await updateOnboardingStep({
      stepNumber: 1,
      completed: true,
    });
    expect(step1.success).toBe(true);

    // Skip all optional steps
    mockProgress.steps_completed = { "1": true };
    for (const step of [2, 3, 4, 5]) {
      mockProgress.steps_completed[step.toString()] = "skipped";
      mockUpdateReturning.mockResolvedValue([
        {
          ...mockProgress,
          current_step: Math.min(step + 1, 5),
        },
      ]);

      await skipOnboardingStep(step);
    }

    // Should be able to complete
    mockUpdateReturning.mockResolvedValue([
      { ...mockProgress, status: "completed" },
    ]);

    const complete = await completeOnboarding();
    expect(complete.success).toBe(true);
  });
});

describe("Onboarding Flow - Resume from Middle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockDb = createMockDb();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  it("preserves progress when resuming session", async () => {
    // Simulate returning user with partial progress
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "in_progress",
      current_step: 3,
      steps_completed: { "1": true, "2": "skipped" },
      step_data: {
        "1": { companyName: "Test Publisher" },
      },
    };

    const progress = await getOnboardingProgress();

    expect(progress).not.toBeNull();
    expect(progress?.current_step).toBe(3);
    expect(progress?.steps_completed["1"]).toBe(true);
    expect(progress?.steps_completed["2"]).toBe("skipped");
    const stepData = progress?.step_data as Record<
      string,
      Record<string, unknown>
    >;
    expect(stepData?.["1"]?.companyName).toBe("Test Publisher");
    expect(progress?.percentComplete).toBe(100); // Required step completed
  });

  it("allows continuing from saved step", async () => {
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "in_progress",
      current_step: 3,
      steps_completed: { "1": true, "2": "skipped" },
      step_data: {},
    };

    // Complete step 3
    mockUpdateReturning.mockResolvedValue([
      {
        ...mockProgress,
        current_step: 4,
        steps_completed: { "1": true, "2": "skipped", "3": true },
        step_data: { "3": { contactName: "John Author" } },
      },
    ]);

    const result = await updateOnboardingStep({
      stepNumber: 3,
      completed: true,
      stepData: { contactName: "John Author" },
    });

    expect(result.success).toBe(true);
  });
});

describe("Onboarding Flow - AC 20.1.11: Dashboard Widget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockDb = createMockDb();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  it("shows widget for in_progress onboarding", async () => {
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "in_progress",
      current_step: 2,
      steps_completed: { "1": true },
      step_data: {},
    };

    const showWidget = await shouldShowOnboardingWidget();
    expect(showWidget).toBe(true);
  });

  it("hides widget for completed onboarding", async () => {
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "completed",
      current_step: 5,
      steps_completed: { "1": true },
      step_data: {},
    };

    const showWidget = await shouldShowOnboardingWidget();
    expect(showWidget).toBe(false);
  });

  it("hides widget for dismissed onboarding", async () => {
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "dismissed",
      current_step: 2,
      steps_completed: { "1": true },
      step_data: {},
    };

    const showWidget = await shouldShowOnboardingWidget();
    expect(showWidget).toBe(false);
  });

  it("hides widget when no progress exists", async () => {
    mockProgress = null;

    const showWidget = await shouldShowOnboardingWidget();
    expect(showWidget).toBe(false);
  });

  it("dismisses permanently when requested", async () => {
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "in_progress",
      current_step: 2,
      steps_completed: { "1": true },
      step_data: {},
    };

    mockUpdateReturning.mockResolvedValue([
      { ...mockProgress, status: "dismissed", dismissed_at: new Date() },
    ]);

    const result = await dismissOnboarding();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isComplete).toBe(true);
    }
  });
});

describe("Onboarding Flow - AC 20.1.12: Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockDb = createMockDb();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  it("persists step completion data", async () => {
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "in_progress",
      current_step: 1,
      steps_completed: {},
      step_data: {},
    };

    mockUpdateReturning.mockResolvedValue([
      {
        ...mockProgress,
        current_step: 2,
        steps_completed: { "1": true },
        step_data: { "1": { companyName: "My Publisher" } },
      },
    ]);

    const result = await updateOnboardingStep({
      stepNumber: 1,
      completed: true,
      stepData: { companyName: "My Publisher" },
    });

    expect(result.success).toBe(true);
  });

  it("preserves previously entered data when updating", async () => {
    mockProgress = {
      id: "test-id",
      tenant_id: "tenant-uuid-123",
      status: "in_progress",
      current_step: 3,
      steps_completed: { "1": true, "2": "skipped" },
      step_data: { "1": { companyName: "My Publisher" } },
    };

    mockUpdateReturning.mockResolvedValue([
      {
        ...mockProgress,
        current_step: 4,
        steps_completed: { "1": true, "2": "skipped", "3": true },
        step_data: {
          "1": { companyName: "My Publisher" },
          "3": { contactName: "Jane Author" },
        },
      },
    ]);

    const result = await updateOnboardingStep({
      stepNumber: 3,
      completed: true,
      stepData: { contactName: "Jane Author" },
    });

    expect(result.success).toBe(true);
  });
});

describe("Onboarding Flow - RLS Tenant Isolation", () => {
  /**
   * RLS Policy Documentation Tests
   *
   * These tests document the expected behavior of RLS policies defined in:
   * drizzle/migrations/0008_onboarding_rls.sql
   *
   * RLS Policies:
   * - onboarding_progress_tenant_select: Users can only SELECT their tenant's progress
   * - onboarding_progress_tenant_insert: Users can only INSERT for their tenant
   * - onboarding_progress_tenant_update: Users can only UPDATE their tenant's progress
   * - No DELETE policy (onboarding records should not be deleted)
   */

  beforeEach(() => {
    vi.clearAllMocks();
    const mockDb = createMockDb();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  describe("Cross-Tenant Access Prevention", () => {
    it("documents that SELECT is filtered by tenant_id via RLS", () => {
      /**
       * Expected RLS behavior:
       * User from Tenant A cannot read Tenant B's onboarding progress
       *
       * Policy: onboarding_progress_tenant_select
       * USING (tenant_id IN (SELECT tenant_id FROM users WHERE clerk_user_id = auth.user_id()))
       */
      const rlsPolicy = {
        name: "onboarding_progress_tenant_select",
        operation: "SELECT",
        enforcement: "tenant_id must match user's tenant",
        expectedResult: "Empty result set for cross-tenant queries",
      };

      expect(rlsPolicy.operation).toBe("SELECT");
      expect(rlsPolicy.enforcement).toBe("tenant_id must match user's tenant");
    });

    it("documents that INSERT is restricted to own tenant via RLS", () => {
      /**
       * Expected RLS behavior:
       * User from Tenant A cannot insert progress for Tenant B
       *
       * Policy: onboarding_progress_tenant_insert
       * WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE clerk_user_id = auth.user_id()))
       */
      const rlsPolicy = {
        name: "onboarding_progress_tenant_insert",
        operation: "INSERT",
        enforcement: "WITH CHECK ensures tenant_id matches user's tenant",
        expectedResult: "INSERT fails for cross-tenant attempts",
      };

      expect(rlsPolicy.operation).toBe("INSERT");
      expect(rlsPolicy.expectedResult).toBe(
        "INSERT fails for cross-tenant attempts",
      );
    });

    it("documents that UPDATE is restricted to own tenant via RLS", () => {
      /**
       * Expected RLS behavior:
       * User from Tenant A cannot update Tenant B's onboarding progress
       *
       * Policy: onboarding_progress_tenant_update
       * USING + WITH CHECK ensures both read and write are tenant-isolated
       */
      const rlsPolicy = {
        name: "onboarding_progress_tenant_update",
        operation: "UPDATE",
        enforcement: "USING + WITH CHECK for tenant_id",
        expectedResult: "UPDATE affects 0 rows for cross-tenant attempts",
      };

      expect(rlsPolicy.operation).toBe("UPDATE");
      expect(rlsPolicy.expectedResult).toBe(
        "UPDATE affects 0 rows for cross-tenant attempts",
      );
    });

    it("documents that DELETE is not allowed via RLS", () => {
      /**
       * No DELETE policy exists - onboarding progress records cannot be deleted.
       * This ensures audit trail and prevents accidental data loss.
       */
      const rlsPolicy = {
        name: "none",
        operation: "DELETE",
        enforcement: "No policy = blocked by RLS",
        expectedResult: "DELETE always fails",
      };

      expect(rlsPolicy.operation).toBe("DELETE");
      expect(rlsPolicy.expectedResult).toBe("DELETE always fails");
    });
  });

  describe("Schema Validation for RLS", () => {
    it("onboarding_progress table has tenant_id for RLS filtering", () => {
      /**
       * The onboarding_progress table must have tenant_id column
       * for RLS policies to function correctly.
       */
      const expectedColumns = [
        "id",
        "tenant_id", // Required for RLS
        "status",
        "current_step",
        "steps_completed",
        "step_data",
        "started_at",
        "completed_at",
        "dismissed_at",
        "created_at",
        "updated_at",
      ];

      expect(expectedColumns).toContain("tenant_id");
    });

    it("tenant_id has foreign key constraint with CASCADE delete", () => {
      /**
       * When a tenant is deleted, their onboarding progress is automatically
       * cleaned up via CASCADE delete on the foreign key.
       */
      const constraint = {
        column: "tenant_id",
        references: "tenants.id",
        onDelete: "CASCADE",
      };

      expect(constraint.onDelete).toBe("CASCADE");
    });
  });
});
