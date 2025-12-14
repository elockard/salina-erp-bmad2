"use client";

/**
 * Announcement Banner Component
 *
 * Story 13.8: Implement Platform-Wide Announcements
 * AC: 2 - Active announcements display in a banner on all tenant dashboards
 * AC: 3 - Users can dismiss informational announcements (stored in localStorage)
 * AC: 4 - Critical announcements cannot be dismissed
 *
 * Features:
 * - Renders announcements as stacked banners
 * - Type-based color coding (critical: red, warning: amber, info: blue)
 * - Markdown support with XSS sanitization
 * - Dismissible for info/warning (localStorage persistence)
 * - Non-dismissible for critical
 * - Z-index stacking below impersonation banner
 */

import DOMPurify from "dompurify";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { marked } from "marked";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ActiveAnnouncement } from "@/modules/platform-admin/types";

const DISMISSED_KEY = "dismissed_announcements";

// Configure marked for inline rendering (no wrapping <p> tags)
marked.use({ breaks: true, gfm: true });

interface AnnouncementBannerProps {
  announcements: ActiveAnnouncement[];
}

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Load dismissed announcements from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      if (stored) {
        setDismissedIds(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleDismiss = (id: string) => {
    const newDismissed = new Set([...dismissedIds, id]);
    setDismissedIds(newDismissed);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...newDismissed]));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Filter out dismissed announcements (only after client mount)
  const visibleAnnouncements = useMemo(() => {
    if (!mounted) return announcements;
    return announcements.filter((a) => !dismissedIds.has(a.id));
  }, [announcements, dismissedIds, mounted]);

  // Parse and sanitize markdown for each announcement
  // Only sanitize on client (DOMPurify requires DOM APIs)
  const parsedAnnouncements = useMemo(() => {
    return visibleAnnouncements.map((a) => {
      // Parse markdown to HTML inline (no paragraph wrapper)
      const rawHtml = marked.parseInline(a.message) as string;
      // Sanitize to prevent XSS - only on client where DOMPurify works
      const sanitizedHtml = mounted
        ? DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS: ["strong", "em", "a", "code", "br"],
            ALLOWED_ATTR: ["href", "target", "rel"],
          })
        : ""; // Return empty during SSR, will re-render on mount
      return {
        ...a,
        htmlContent: sanitizedHtml,
      };
    });
  }, [visibleAnnouncements, mounted]);

  // Don't render until client-side mount (DOMPurify needs DOM)
  if (!mounted || parsedAnnouncements.length === 0) return null;

  const getStyles = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-red-600 text-white";
      case "warning":
        return "bg-amber-500 text-black";
      default:
        return "bg-blue-600 text-white";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 flex-shrink-0" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 flex-shrink-0" />;
      default:
        return <Info className="h-5 w-5 flex-shrink-0" />;
    }
  };

  return (
    <div className="announcement-banners z-40">
      {parsedAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={`flex items-center justify-between px-4 py-2 ${getStyles(announcement.type)}`}
        >
          <div className="flex items-center gap-2">
            {getIcon(announcement.type)}
            <span
              className="text-sm font-medium [&_a]:underline [&_code]:rounded [&_code]:bg-black/20 [&_code]:px-1 [&_em]:italic [&_strong]:font-bold"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
              dangerouslySetInnerHTML={{ __html: announcement.htmlContent }}
            />
          </div>
          {/* Critical announcements cannot be dismissed */}
          {announcement.type !== "critical" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(announcement.id)}
              className="h-6 w-6 p-0 hover:bg-black/10"
              aria-label="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
