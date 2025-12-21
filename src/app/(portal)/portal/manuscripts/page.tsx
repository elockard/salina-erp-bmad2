import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { contacts } from "@/db/schema/contacts";
import { getCurrentUser, getDb } from "@/lib/auth";
import { getAuthorTitleOptions } from "@/modules/manuscripts";

import { AuthorManuscriptSubmissions } from "../components/author-manuscript-submissions";
import { AuthorManuscriptSubmissionsSkeleton } from "../components/author-manuscript-submissions-skeleton";
import { ManuscriptUploadForm } from "../components/manuscript-upload-form";

/**
 * Author Manuscripts Page
 *
 * Story: 21.3 - Upload Manuscript Files
 * AC-21.3.1: Upload interface for manuscripts
 * AC-21.3.6: View submission history with status
 *
 * Provides manuscript upload form and submission history.
 */
export default async function ManuscriptsPage() {
  const user = await getCurrentUser();

  // This should be caught by layout, but double-check
  if (!user || user.role !== "author") {
    redirect("/sign-in");
  }

  // Get author contact linked to this portal user
  const db = await getDb();
  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.portal_user_id, user.id),
      eq(contacts.status, "active"),
    ),
    with: { roles: true },
  });

  // If no author contact linked, something went wrong
  if (!contact || !contact.roles.some((r) => r.role === "author")) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-destructive">
            Access Error
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your portal account is not properly linked. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Get author's titles for dropdown selection
  const titles = await getAuthorTitleOptions(contact.id, user.tenant_id);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold">Manuscripts</h1>
        <p className="text-muted-foreground">
          Submit manuscripts and track your submissions
        </p>
      </div>

      {/* Upload form */}
      <ManuscriptUploadForm titles={titles} />

      {/* Submissions list with loading skeleton */}
      <Suspense fallback={<AuthorManuscriptSubmissionsSkeleton />}>
        <AuthorManuscriptSubmissions
          contactId={contact.id}
          tenantId={user.tenant_id}
        />
      </Suspense>
    </div>
  );
}
