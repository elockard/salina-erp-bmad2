"use client";

/**
 * Single notification item component
 * Story 20.2: Build Notifications Center
 * AC 20.2.3, 20.2.4: Notification display with icon and timestamp
 */

import {
  AlertCircle,
  CheckCircle,
  Factory,
  FileText,
  Info,
  Megaphone,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "../types";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}

// Icon mapping for notification types
const notificationIcons: Record<
  NotificationType,
  { icon: typeof CheckCircle; className: string }
> = {
  feed_success: { icon: CheckCircle, className: "text-green-500" },
  feed_failed: { icon: XCircle, className: "text-red-500" },
  action_pending_return: { icon: RotateCcw, className: "text-amber-500" },
  action_low_isbn: { icon: AlertCircle, className: "text-amber-500" },
  system_announcement: { icon: Megaphone, className: "text-blue-500" },
  import_complete: { icon: FileText, className: "text-green-500" },
  manuscript_submitted: { icon: FileText, className: "text-blue-500" }, // Story 21.3
  production_milestone: { icon: Factory, className: "text-blue-500" }, // Story 21.4
};

// Format relative timestamp
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationItemProps) {
  const { icon: Icon, className: iconClassName } = notificationIcons[
    notification.type
  ] || {
    icon: Info,
    className: "text-muted-foreground",
  };

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      onClose();
    }
  };

  const content = (
    <button
      type="button"
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer w-full text-left",
        notification.isRead
          ? "bg-transparent hover:bg-muted/50"
          : "bg-muted/30 hover:bg-muted/50",
      )}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={cn("h-5 w-5", iconClassName)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium truncate",
              !notification.isRead && "font-semibold",
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
        {notification.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(new Date(notification.createdAt))}
        </p>
      </div>
    </button>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
