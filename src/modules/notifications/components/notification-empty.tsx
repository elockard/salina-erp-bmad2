"use client";

/**
 * Empty notifications state component
 * Story 20.2: Build Notifications Center
 * AC 20.2.3: Display friendly empty state
 */

import { Bell } from "lucide-react";

export function NotificationEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <Bell className="h-10 w-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">
        No notifications
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        You&apos;re all caught up!
      </p>
    </div>
  );
}
