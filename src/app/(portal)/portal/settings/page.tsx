import { Bell, Settings } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

/**
 * Author Portal Settings Index Page
 *
 * Story: 21.4 - Receive Production Milestone Notifications
 * AC-21.4.3: Author can access notification preferences in portal
 */
export default async function PortalSettingsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "author") {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/portal/settings/notifications">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure which production milestones you want to be notified
                about
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Choose when to receive in-app and email notifications for your
                books in production.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
