import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { contacts } from "@/db/schema/contacts";
import { getCurrentUser, getDb } from "@/lib/auth";
import { getEffectiveAuthorPreferences } from "@/modules/author-notifications/queries";
import { AuthorMilestonePreferences } from "../../components/author-milestone-preferences";

/**
 * Author Notification Preferences Page
 *
 * Story: 21.4 - Receive Production Milestone Notifications
 * AC-21.4.3: Author can configure which production stages trigger notifications
 */
export default async function PortalNotificationsPage() {
  const user = await getCurrentUser();

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
  });

  if (!contact) {
    redirect("/sign-in");
  }

  // Get current preferences (with defaults)
  const preferences = await getEffectiveAuthorPreferences(
    contact.id,
    user.tenant_id,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Notification Preferences</h1>
      </div>

      <div className="max-w-2xl">
        <AuthorMilestonePreferences preferences={preferences} />
      </div>
    </div>
  );
}
