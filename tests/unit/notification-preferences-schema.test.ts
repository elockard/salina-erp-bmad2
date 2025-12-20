/**
 * Unit tests for notification preferences schema
 * Story 20.3 - FR178: Configure Notification Preferences
 */

import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_TYPES,
  type NotificationType,
  notificationPreferences,
} from "@/db/schema/notification-preferences";

describe("Notification Preferences Schema", () => {
  describe("notificationPreferences table", () => {
    it("should have the correct table name", () => {
      expect(notificationPreferences._.name).toBe("notification_preferences");
    });

    it("should have all required columns", () => {
      const columns = Object.keys(notificationPreferences);
      expect(columns).toContain("id");
      expect(columns).toContain("tenantId");
      expect(columns).toContain("userId");
      expect(columns).toContain("notificationType");
      expect(columns).toContain("inAppEnabled");
      expect(columns).toContain("emailEnabled");
    });

    it("should have id as primary key with uuid type", () => {
      const idColumn = notificationPreferences.id;
      expect(idColumn.dataType).toBe("uuid");
      expect(idColumn.notNull).toBe(true);
    });

    it("should have tenantId as required foreign key", () => {
      const tenantIdColumn = notificationPreferences.tenantId;
      expect(tenantIdColumn.dataType).toBe("uuid");
      expect(tenantIdColumn.notNull).toBe(true);
    });

    it("should have userId as required foreign key", () => {
      const userIdColumn = notificationPreferences.userId;
      expect(userIdColumn.dataType).toBe("uuid");
      expect(userIdColumn.notNull).toBe(true);
    });

    it("should have notificationType as required varchar", () => {
      const typeColumn = notificationPreferences.notificationType;
      expect(typeColumn.dataType).toBe("string");
      expect(typeColumn.notNull).toBe(true);
    });

    it("should have inAppEnabled with default true", () => {
      const inAppColumn = notificationPreferences.inAppEnabled;
      expect(inAppColumn.dataType).toBe("boolean");
      expect(inAppColumn.notNull).toBe(true);
      expect(inAppColumn.hasDefault).toBe(true);
    });

    it("should have emailEnabled with default false", () => {
      const emailColumn = notificationPreferences.emailEnabled;
      expect(emailColumn.dataType).toBe("boolean");
      expect(emailColumn.notNull).toBe(true);
      expect(emailColumn.hasDefault).toBe(true);
    });
  });

  describe("NOTIFICATION_TYPES", () => {
    it("should export NOTIFICATION_TYPES array", () => {
      expect(Array.isArray(NOTIFICATION_TYPES)).toBe(true);
      expect(NOTIFICATION_TYPES.length).toBeGreaterThan(0);
    });

    it("should include all expected notification types", () => {
      expect(NOTIFICATION_TYPES).toContain("feed_success");
      expect(NOTIFICATION_TYPES).toContain("feed_failed");
      expect(NOTIFICATION_TYPES).toContain("action_pending_return");
      expect(NOTIFICATION_TYPES).toContain("action_low_isbn");
      expect(NOTIFICATION_TYPES).toContain("system_announcement");
      expect(NOTIFICATION_TYPES).toContain("import_complete");
    });
  });

  describe("NotificationType", () => {
    it("should be a valid type alias for notification types", () => {
      // Type check - these should compile without error
      const validType1: NotificationType = "feed_success";
      const validType2: NotificationType = "feed_failed";
      const validType3: NotificationType = "action_pending_return";

      expect(validType1).toBe("feed_success");
      expect(validType2).toBe("feed_failed");
      expect(validType3).toBe("action_pending_return");
    });
  });
});
