/**
 * iCal Export API Route for Author Portal
 *
 * Generates iCal (.ics) file with author's publication dates.
 *
 * Story: 21.5 - View Publication Schedule
 * AC-21.5.4: Export to iCal (.ics) file
 */

import { auth } from "@clerk/nextjs/server";
import { parseISO } from "date-fns";
import { and, eq } from "drizzle-orm";

import { adminDb } from "@/db";
import { contacts, users } from "@/db/schema";
import { getAuthorProductionProjects } from "@/modules/production/queries";
import type {
  AuthorProductionProject,
  CalendarEvent,
} from "@/modules/production/types";
import { generateICalExport } from "@/modules/production/utils/ical-export";

/**
 * Transform AuthorProductionProject to CalendarEvent for iCal export
 */
function toCalendarEvents(
  projects: AuthorProductionProject[],
): CalendarEvent[] {
  return projects
    .filter(
      (p): p is AuthorProductionProject & { targetPublicationDate: string } =>
        p.targetPublicationDate !== null,
    )
    .map((p) => ({
      id: `pub-${p.projectId}`,
      title: `📚 ${p.titleName} Publication`,
      start: parseISO(p.targetPublicationDate),
      end: parseISO(p.targetPublicationDate),
      type: "publication_date" as const,
      projectId: p.projectId,
      projectTitle: p.titleName,
      workflowStage: p.workflowStage,
      isOverdue: p.isOverdue,
    }));
}

export async function GET() {
  try {
    // Authenticate via Clerk
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get internal user
    const user = await adminDb.query.users.findFirst({
      where: eq(users.clerk_user_id, clerkUserId),
    });
    if (!user || user.role !== "author") {
      return new Response("Forbidden", { status: 403 });
    }

    // Get author's contact
    const contact = await adminDb.query.contacts.findFirst({
      where: and(
        eq(contacts.portal_user_id, user.id),
        eq(contacts.status, "active"),
      ),
    });
    if (!contact) {
      return new Response("Author not found", { status: 404 });
    }

    // Get author's production projects
    const projects = await getAuthorProductionProjects(
      contact.id,
      user.tenant_id,
    );

    // Transform to calendar events
    const events = toCalendarEvents(projects);

    // Generate iCal content (works even with empty events array)
    // M2 Fix: Return valid empty calendar instead of 404
    const icsContent = generateICalExport(events);

    // Return with proper headers
    return new Response(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="my-publication-schedule.ics"',
      },
    });
  } catch (error) {
    // M1 Fix: Handle errors gracefully
    console.error("[iCal Export] Error generating calendar:", error);
    return new Response("Failed to generate calendar export", { status: 500 });
  }
}
