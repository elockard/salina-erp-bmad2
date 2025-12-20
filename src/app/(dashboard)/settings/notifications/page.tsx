/**
 * Notification Preferences Settings Page
 *
 * Story 20.3 - FR178: Configure Notification Preferences
 *
 * Settings page for managing notification preferences.
 * AC 20.3.1: Accessible from Settings menu.
 */

import type { Metadata } from "next";
import { NotificationPreferencesForm } from "@/modules/notifications/components/notification-preferences-form";

export const metadata: Metadata = {
  title: "Notification Preferences | Settings",
  description:
    "Configure your notification preferences by channel and event type",
};

export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Notification Preferences
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure how you receive notifications for different events.
        </p>
      </div>

      <NotificationPreferencesForm />
    </div>
  );
}
