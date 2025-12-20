"use client";

/**
 * Notifications polling hook using TanStack Query
 * Story 20.2: Build Notifications Center
 * AC 20.2.1, 20.2.2: 30-second polling for real-time updates
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../actions";
import type { NotificationsResponse } from "../types";

// Query keys for cache management
export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unreadCount"] as const,
};

// Polling interval: 30 seconds
const POLLING_INTERVAL = 30 * 1000;

interface UseNotificationsOptions {
  /** Whether polling is enabled (default: true). Set to false when panel is closed. */
  enabled?: boolean;
}

/**
 * Hook to fetch and poll notifications
 * AC 20.2.9: Polling stops when panel is closed (enabled=false)
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  // Fetch notifications with polling
  // AC 20.2.9: Stops when panel closed, pauses when tab hidden
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      const result = await fetchNotifications();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    refetchInterval: enabled ? POLLING_INTERVAL : false, // Stop polling when disabled
    refetchIntervalInBackground: false, // AC 20.2.9: Pause polling when tab hidden
    staleTime: POLLING_INTERVAL / 2,
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await markNotificationAsRead({ notificationId });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onMutate: async (notificationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });

      // Snapshot previous value
      const previous = queryClient.getQueryData<NotificationsResponse>(
        notificationKeys.list(),
      );

      // Optimistically update
      if (previous) {
        queryClient.setQueryData<NotificationsResponse>(
          notificationKeys.list(),
          {
            ...previous,
            notifications: previous.notifications.map((n) =>
              n.id === notificationId
                ? { ...n, isRead: true, readAt: new Date() }
                : n,
            ),
            unreadCount: Math.max(0, previous.unreadCount - 1),
          },
        );
      }

      return { previous };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      // Refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const result = await markAllNotificationsAsRead();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });

      // Snapshot previous value
      const previous = queryClient.getQueryData<NotificationsResponse>(
        notificationKeys.list(),
      );

      // Optimistically mark all as read
      if (previous) {
        queryClient.setQueryData<NotificationsResponse>(
          notificationKeys.list(),
          {
            ...previous,
            notifications: previous.notifications.map((n) => ({
              ...n,
              isRead: true,
              readAt: n.readAt || new Date(),
            })),
            unreadCount: 0,
          },
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      // Refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });

  return {
    notifications: notificationsData?.notifications ?? [],
    unreadCount: notificationsData?.unreadCount ?? 0,
    totalCount: notificationsData?.totalCount ?? 0,
    isLoading,
    error,
    refetch,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

/**
 * Hook to fetch only unread count (lighter polling for badge)
 */
export function useUnreadCount() {
  const { data, isLoading } = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const result = await fetchUnreadCount();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    refetchInterval: POLLING_INTERVAL,
    refetchIntervalInBackground: false, // AC 20.2.9: Pause polling when tab hidden
    staleTime: POLLING_INTERVAL / 2,
  });

  return {
    unreadCount: data ?? 0,
    isLoading,
  };
}
