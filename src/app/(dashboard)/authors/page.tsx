import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthorsSplitView } from "@/modules/authors/components/authors-split-view";
import { getAuthors } from "@/modules/authors/queries";

/**
 * Authors management page - Server Component
 *
 * AC 1: Route /dashboard/authors renders Split View layout
 * AC 33: Server Components used for initial data fetch
 */

export const metadata = {
  title: "Authors | Salina ERP",
  description: "Manage author profiles for your publishing company",
};

export default async function AuthorsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Authors role should not access this page
  if (user.role === "author") {
    redirect("/portal");
  }

  // Fetch initial authors (Server-side)
  const authors = await getAuthors();

  return (
    <div className="h-full">
      <AuthorsSplitView initialAuthors={authors} />
    </div>
  );
}
