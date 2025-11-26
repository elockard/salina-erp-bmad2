import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

/**
 * Portal Layout - For Author Portal Users
 *
 * Story 2.3 - Author Portal Access Provisioning
 *
 * AC 20: (portal) route group directory created at /app/(portal)/
 * AC 21: Protected by middleware requiring role="author"
 * AC 22: Layout includes minimal header with "Author Portal" title and sign-out link
 * AC 23: Only portal-specific routes accessible; dashboard returns redirect
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect unauthenticated users to sign-in
  if (!user) {
    redirect("/sign-in");
  }

  // AC 21: Only allow author role users
  if (user.role !== "author") {
    // Non-author users should use the dashboard
    redirect("/dashboard");
  }

  // AC 22: Check if user is active
  if (!user.is_active) {
    // Inactive users cannot access the portal
    redirect("/sign-in?error=account-inactive");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* AC 22: Minimal header with Author Portal title and sign-out */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Author Portal</h1>
          <SignOutButton>
            <Button variant="ghost" size="sm">
              Sign Out
            </Button>
          </SignOutButton>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        <p>Salina ERP Author Portal</p>
      </footer>
    </div>
  );
}
