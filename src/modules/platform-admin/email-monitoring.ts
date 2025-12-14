/**
 * Platform Admin Email Monitoring
 *
 * Story 13.7: Build System Health and Job Monitoring (AC: 5)
 *
 * Provides email delivery metrics via Resend API integration.
 * Falls back gracefully when API key is unavailable.
 */

import type { EmailMetrics } from "./types";

/**
 * Resend dashboard URL for manual verification
 */
const RESEND_DASHBOARD_URL = "https://resend.com/overview";

/**
 * Get email delivery metrics from Resend
 *
 * Gracefully handles missing API key or API errors.
 * Never throws - returns error status instead.
 *
 * @returns EmailMetrics with status and dashboard link
 */
export async function getEmailMetrics(): Promise<EmailMetrics> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      sentLast24h: null,
      deliveredLast24h: null,
      failedLast24h: null,
      dashboardUrl: RESEND_DASHBOARD_URL,
      status: "unknown",
    };
  }

  try {
    // Resend API: GET /emails returns recent emails
    // Note: Limited to recent emails, not full analytics
    const response = await fetch("https://api.resend.com/emails", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      console.error("Resend API error:", response.status);
      return {
        sentLast24h: null,
        deliveredLast24h: null,
        failedLast24h: null,
        dashboardUrl: RESEND_DASHBOARD_URL,
        status: "error",
      };
    }

    // Resend API returns emails with status field
    interface ResendEmail {
      id: string;
      last_event: string; // e.g., "delivered", "bounced", "complained", "sent"
      created_at: string;
    }
    const data = (await response.json()) as { data?: ResendEmail[] };

    // Filter to last 24 hours and count by status
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;

    for (const email of data.data ?? []) {
      const emailDate = new Date(email.created_at).getTime();
      if (emailDate < oneDayAgo) continue;

      sentCount++;
      if (email.last_event === "delivered") {
        deliveredCount++;
      } else if (
        email.last_event === "bounced" ||
        email.last_event === "complained"
      ) {
        failedCount++;
      }
    }

    return {
      sentLast24h: sentCount,
      deliveredLast24h: deliveredCount,
      failedLast24h: failedCount,
      dashboardUrl: RESEND_DASHBOARD_URL,
      status: "healthy",
    };
  } catch (error) {
    console.error("getEmailMetrics error:", error);
    return {
      sentLast24h: null,
      deliveredLast24h: null,
      failedLast24h: null,
      dashboardUrl: RESEND_DASHBOARD_URL,
      status: "error",
    };
  }
}
