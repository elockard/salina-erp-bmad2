/**
 * Unit tests for notification preferences constants
 * Story 20.3 - FR178: Configure Notification Preferences
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  getDefaultPreference,
  getEffectivePreference,
} from "@/modules/notifications/constants";

describe("Notification Preferences Constants", () => {
  describe("DEFAULT_PREFERENCES", () => {
    it("should have exactly 6 notification types", () => {
      expect(DEFAULT_PREFERENCES).toHaveLength(6);
    });

    it("should include all expected notification types", () => {
      const types = DEFAULT_PREFERENCES.map((p) => p.type);
      expect(types).toContain("feed_success");
      expect(types).toContain("feed_failed");
      expect(types).toContain("action_pending_return");
      expect(types).toContain("action_low_isbn");
      expect(types).toContain("system_announcement");
      expect(types).toContain("import_complete");
    });

    it("should have labels and descriptions for all types", () => {
      for (const pref of DEFAULT_PREFERENCES) {
        expect(pref.label).toBeTruthy();
        expect(pref.description).toBeTruthy();
        expect(typeof pref.defaultInApp).toBe("boolean");
        expect(typeof pref.defaultEmail).toBe("boolean");
      }
    });

    it("should have correct defaults for feed_failed (email ON)", () => {
      const pref = DEFAULT_PREFERENCES.find((p) => p.type === "feed_failed");
      expect(pref?.defaultInApp).toBe(true);
      expect(pref?.defaultEmail).toBe(true);
    });

    it("should have correct defaults for feed_success (email OFF)", () => {
      const pref = DEFAULT_PREFERENCES.find((p) => p.type === "feed_success");
      expect(pref?.defaultInApp).toBe(true);
      expect(pref?.defaultEmail).toBe(false);
    });
  });

  describe("getDefaultPreference", () => {
    it("should return correct preference for known type", () => {
      const pref = getDefaultPreference("feed_failed");
      expect(pref.type).toBe("feed_failed");
      expect(pref.defaultEmail).toBe(true);
    });

    it("should return first preference for unknown type", () => {
      const pref = getDefaultPreference("unknown_type" as any);
      expect(pref).toBe(DEFAULT_PREFERENCES[0]);
    });
  });

  describe("getEffectivePreference", () => {
    it("should return saved values when provided", () => {
      const result = getEffectivePreference(false, false, "feed_failed");
      expect(result.inApp).toBe(false);
      expect(result.email).toBe(false);
    });

    it("should return defaults when saved is undefined", () => {
      const result = getEffectivePreference(
        undefined,
        undefined,
        "feed_failed",
      );
      expect(result.inApp).toBe(true);
      expect(result.email).toBe(true);
    });

    it("should use defaults for individual undefined values", () => {
      const result = getEffectivePreference(
        undefined,
        undefined,
        "feed_success",
      );
      expect(result.inApp).toBe(true); // default for feed_success
      expect(result.email).toBe(false); // default for feed_success
    });
  });
});
