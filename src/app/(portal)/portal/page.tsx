import { and, eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authors } from "@/db/schema/authors";
import { getCurrentUser, getDb } from "@/lib/auth";

/**
 * Author Portal Landing Page
 *
 * Story 2.3 - Author Portal Access Provisioning
 *
 * AC 24: /portal route displays "Welcome, {author_name}" message
 * AC 25: Page shows placeholder for future royalty statement functionality
 * AC 26: Page only accessible to authenticated author users (enforced by layout)
 */
export default async function PortalPage() {
  const user = await getCurrentUser();

  // This should be caught by layout, but double-check
  if (!user || user.role !== "author") {
    redirect("/sign-in");
  }

  // Get author information linked to this portal user
  const db = await getDb();
  const author = await db.query.authors.findFirst({
    where: and(
      eq(authors.portal_user_id, user.id),
      eq(authors.is_active, true),
    ),
  });

  // If no author linked, something went wrong
  if (!author) {
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

  return (
    <div className="space-y-6">
      {/* AC 24: Welcome message with author name */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {author.name}
        </h1>
        <p className="text-muted-foreground mt-2">
          Access your royalty statements and account information
        </p>
      </div>

      {/* AC 25: Placeholder for future royalty statement functionality */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Royalty Statements
            </CardTitle>
            <CardDescription>
              View and download your royalty statements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-muted-foreground">
                No statements available yet.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Royalty statements will appear here once they are generated.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your registered details with the publisher
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-medium">{author.name}</div>
            </div>
            {author.email && (
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{author.email}</div>
              </div>
            )}
            {author.payment_method && (
              <div>
                <div className="text-sm text-muted-foreground">
                  Payment Method
                </div>
                <div className="font-medium capitalize">
                  {author.payment_method.replace("_", " ")}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-4">
              To update your information, please contact your publisher.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coming soon notice */}
      <Card className="bg-muted/50">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🚀</div>
            <div>
              <h3 className="font-semibold">More Features Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                We&apos;re working on bringing you more features including
                statement downloads, payment history, and title analytics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
