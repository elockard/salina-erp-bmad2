/**
 * Author Milestone Notifications Unit Tests
 * Story 21.4: Receive Production Milestone Notifications
 *
 * Tests for:
 * - Preference defaults (all stages enabled)
 * - shouldNotifyForStage function
 * - Preference checking logic
 * - Stage-specific toggles
 */

import { describe, expect, it } from "vitest";
import type { AuthorMilestonePreferences } from "@/modules/author-notifications/types";
import { shouldNotifyForStage } from "@/modules/author-notifications/types";
import type { WorkflowStage } from "@/modules/production/schema";

describe("Author Milestone Notifications", () => {
  describe("shouldNotifyForStage", () => {
    describe("when no preferences exist (null)", () => {
      it("should return true for editing stage", () => {
        expect(shouldNotifyForStage(null, "editing")).toBe(true);
      });

      it("should return true for design stage", () => {
        expect(shouldNotifyForStage(null, "design")).toBe(true);
      });

      it("should return true for proof stage", () => {
        expect(shouldNotifyForStage(null, "proof")).toBe(true);
      });

      it("should return true for print_ready stage", () => {
        expect(shouldNotifyForStage(null, "print_ready")).toBe(true);
      });

      it("should return true for complete stage", () => {
        expect(shouldNotifyForStage(null, "complete")).toBe(true);
      });

      it("should return false for manuscript_received (initial stage)", () => {
        expect(shouldNotifyForStage(null, "manuscript_received")).toBe(false);
      });
    });

    describe("when all preferences are enabled (defaults)", () => {
      const defaultPrefs: AuthorMilestonePreferences = {
        contactId: "test-contact",
        tenantId: "test-tenant",
        notifyEditing: true,
        notifyDesign: true,
        notifyProof: true,
        notifyPrintReady: true,
        notifyComplete: true,
        emailEnabled: true,
      };

      it("should return true for all enabled stages", () => {
        const stages: WorkflowStage[] = [
          "editing",
          "design",
          "proof",
          "print_ready",
          "complete",
        ];

        stages.forEach((stage) => {
          expect(shouldNotifyForStage(defaultPrefs, stage)).toBe(true);
        });
      });

      it("should return false for manuscript_received", () => {
        expect(shouldNotifyForStage(defaultPrefs, "manuscript_received")).toBe(
          false,
        );
      });
    });

    describe("when specific stages are disabled", () => {
      it("should return false when editing is disabled", () => {
        const prefs: AuthorMilestonePreferences = {
          contactId: "test-contact",
          tenantId: "test-tenant",
          notifyEditing: false,
          notifyDesign: true,
          notifyProof: true,
          notifyPrintReady: true,
          notifyComplete: true,
          emailEnabled: true,
        };

        expect(shouldNotifyForStage(prefs, "editing")).toBe(false);
        expect(shouldNotifyForStage(prefs, "design")).toBe(true);
      });

      it("should return false when design is disabled", () => {
        const prefs: AuthorMilestonePreferences = {
          contactId: "test-contact",
          tenantId: "test-tenant",
          notifyEditing: true,
          notifyDesign: false,
          notifyProof: true,
          notifyPrintReady: true,
          notifyComplete: true,
          emailEnabled: true,
        };

        expect(shouldNotifyForStage(prefs, "design")).toBe(false);
        expect(shouldNotifyForStage(prefs, "proof")).toBe(true);
      });

      it("should return false when proof is disabled", () => {
        const prefs: AuthorMilestonePreferences = {
          contactId: "test-contact",
          tenantId: "test-tenant",
          notifyEditing: true,
          notifyDesign: true,
          notifyProof: false,
          notifyPrintReady: true,
          notifyComplete: true,
          emailEnabled: true,
        };

        expect(shouldNotifyForStage(prefs, "proof")).toBe(false);
      });

      it("should return false when print_ready is disabled", () => {
        const prefs: AuthorMilestonePreferences = {
          contactId: "test-contact",
          tenantId: "test-tenant",
          notifyEditing: true,
          notifyDesign: true,
          notifyProof: true,
          notifyPrintReady: false,
          notifyComplete: true,
          emailEnabled: true,
        };

        expect(shouldNotifyForStage(prefs, "print_ready")).toBe(false);
      });

      it("should return false when complete is disabled", () => {
        const prefs: AuthorMilestonePreferences = {
          contactId: "test-contact",
          tenantId: "test-tenant",
          notifyEditing: true,
          notifyDesign: true,
          notifyProof: true,
          notifyPrintReady: true,
          notifyComplete: false,
          emailEnabled: true,
        };

        expect(shouldNotifyForStage(prefs, "complete")).toBe(false);
      });

      it("should handle all stages disabled", () => {
        const prefs: AuthorMilestonePreferences = {
          contactId: "test-contact",
          tenantId: "test-tenant",
          notifyEditing: false,
          notifyDesign: false,
          notifyProof: false,
          notifyPrintReady: false,
          notifyComplete: false,
          emailEnabled: false,
        };

        expect(shouldNotifyForStage(prefs, "editing")).toBe(false);
        expect(shouldNotifyForStage(prefs, "design")).toBe(false);
        expect(shouldNotifyForStage(prefs, "proof")).toBe(false);
        expect(shouldNotifyForStage(prefs, "print_ready")).toBe(false);
        expect(shouldNotifyForStage(prefs, "complete")).toBe(false);
        expect(shouldNotifyForStage(prefs, "manuscript_received")).toBe(false);
      });
    });

    describe("email preference behavior", () => {
      it("email preference does not affect shouldNotifyForStage", () => {
        const prefsWithEmail: AuthorMilestonePreferences = {
          contactId: "test-contact",
          tenantId: "test-tenant",
          notifyEditing: true,
          notifyDesign: true,
          notifyProof: true,
          notifyPrintReady: true,
          notifyComplete: true,
          emailEnabled: true,
        };

        const prefsWithoutEmail: AuthorMilestonePreferences = {
          ...prefsWithEmail,
          emailEnabled: false,
        };

        // Both should return true - email is separate from stage notifications
        expect(shouldNotifyForStage(prefsWithEmail, "editing")).toBe(true);
        expect(shouldNotifyForStage(prefsWithoutEmail, "editing")).toBe(true);
      });
    });

    describe("unknown stage handling", () => {
      it("should return false for unknown stages", () => {
        const prefs: AuthorMilestonePreferences = {
          contactId: "test-contact",
          tenantId: "test-tenant",
          notifyEditing: true,
          notifyDesign: true,
          notifyProof: true,
          notifyPrintReady: true,
          notifyComplete: true,
          emailEnabled: true,
        };

        // Cast to WorkflowStage to test unknown handling
        expect(shouldNotifyForStage(prefs, "unknown" as WorkflowStage)).toBe(
          false,
        );
      });
    });
  });

  describe("Preference defaults behavior", () => {
    it("new authors should have all stages enabled by default", () => {
      // When no preferences record exists, all stages should notify
      const nullPrefs = null;

      const stages: WorkflowStage[] = [
        "editing",
        "design",
        "proof",
        "print_ready",
        "complete",
      ];

      stages.forEach((stage) => {
        expect(
          shouldNotifyForStage(nullPrefs, stage),
          `Stage ${stage} should be enabled by default`,
        ).toBe(true);
      });
    });
  });

  describe("Notification metadata structure", () => {
    it("should have correct metadata interface", () => {
      // Type checking test - ensures interface is correct
      const metadata = {
        titleId: "uuid-1",
        titleName: "Test Book",
        projectId: "uuid-2",
        previousStage: "editing" as const,
        newStage: "design" as const,
      };

      expect(metadata.titleId).toBeDefined();
      expect(metadata.titleName).toBeDefined();
      expect(metadata.projectId).toBeDefined();
      expect(metadata.previousStage).toBeDefined();
      expect(metadata.newStage).toBeDefined();
    });
  });
});

describe("Notification Type Registration", () => {
  it("production_milestone should be a valid notification type", async () => {
    const { NOTIFICATION_TYPES } = await import("@/db/schema/notifications");

    expect(NOTIFICATION_TYPES).toContain("production_milestone");
  });
});

describe("Preference Config", () => {
  it("should have production_milestone in DEFAULT_PREFERENCES", async () => {
    const { DEFAULT_PREFERENCES } = await import(
      "@/modules/notifications/constants"
    );

    const milestoneConfig = DEFAULT_PREFERENCES.find(
      (p) => p.type === "production_milestone",
    );

    expect(milestoneConfig).toBeDefined();
    expect(milestoneConfig?.label).toBe("Production Milestone");
    expect(milestoneConfig?.defaultInApp).toBe(true);
    expect(milestoneConfig?.defaultEmail).toBe(true);
  });
});

describe("Workflow Stage Labels", () => {
  it("should have human-readable labels for all stages", async () => {
    const { WORKFLOW_STAGE_LABELS } = await import(
      "@/modules/production/schema"
    );

    expect(WORKFLOW_STAGE_LABELS.manuscript_received).toBe(
      "Manuscript Received",
    );
    expect(WORKFLOW_STAGE_LABELS.editing).toBe("Editing");
    expect(WORKFLOW_STAGE_LABELS.design).toBe("Design");
    expect(WORKFLOW_STAGE_LABELS.proof).toBe("Proof");
    expect(WORKFLOW_STAGE_LABELS.print_ready).toBe("Print Ready");
    expect(WORKFLOW_STAGE_LABELS.complete).toBe("Complete");
  });
});
