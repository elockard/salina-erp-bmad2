"use client";

/**
 * Notification panel component (dropdown content)
 * Story 20.2: Build Notifications Center
 * AC 20.2.2, 20.2.5: Panel with notification list and Mark All Read
 */

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Notification } from "../types";
import { NotificationEmpty } from "./notification-empty";
import { NotificationItem } from "./notification-item";

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export function NotificationPanel({
  notifications,
  unreadCount,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationPanelProps) {
  return (
    <div className="flex flex-col w-80 max-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto py-1 px-2 text-xs text-primary hover:text-primary"
            onClick={onMarkAllAsRead}
          >
            Mark All Read
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <NotificationEmpty />
      ) : (
        <ScrollArea className="flex-1 max-h-[340px]">
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onClose={onClose}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
