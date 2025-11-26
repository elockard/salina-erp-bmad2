import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TitlesSplitView } from "@/modules/titles/components/titles-split-view";
import { getTitles } from "@/modules/titles/queries";

/**
 * Titles management page - Server Component
 *
 * AC 1: Route /dashboard/titles renders Split View layout
 */

export const metadata = {
  title: "Titles | Salina ERP",
  description: "Manage title catalog for your publishing company",
};

export default async function TitlesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Authors role should not access this page - redirect to portal
  if (user.role === "author") {
    redirect("/portal");
  }

  // Fetch initial titles (Server-side)
  const titles = await getTitles();

  return (
    <div className="h-full">
      <TitlesSplitView initialTitles={titles} />
    </div>
  );
}
