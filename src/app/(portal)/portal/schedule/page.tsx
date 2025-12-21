/**
 * Publication Schedule Page
 *
 * Displays scheduled publication dates in a timeline view grouped by month.
 *
 * Story: 21.5 - View Publication Schedule
 * AC-21.5.1: See all scheduled publication dates grouped by month
 * AC-21.5.5: Empty state when no projects
 */

import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

// L1 Fix: Add page metadata for SEO and browser title
export const metadata: Metadata = {
  title: "Publication Schedule | Author Portal",
  description: "View your scheduled publication dates and export to calendar",
};

import { contacts } from "@/db/schema/contacts";
import { getCurrentUser, getDb } from "@/lib/auth";

import { AuthorPublicationSchedule } from "../components/author-publication-schedule";
import { AuthorPublicationScheduleSkeleton } from "../components/author-publication-schedule-skeleton";

export default async function SchedulePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "author") redirect("/sign-in");

  const db = await getDb();
  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.portal_user_id, user.id),
      eq(contacts.status, "active"),
    ),
    with: { roles: true },
  });

  if (!contact || !contact.roles.some((r) => r.role === "author")) {
    return <div>Author profile not found</div>;
  }

  return (
    <Suspense fallback={<AuthorPublicationScheduleSkeleton />}>
      <AuthorPublicationSchedule
        contactId={contact.id}
        tenantId={user.tenant_id}
      />
    </Suspense>
  );
}
