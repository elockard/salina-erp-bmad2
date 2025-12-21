import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProductionSplitView } from "@/modules/production/components";
import {
  getAvailableTitlesForProduction,
  getProductionProjects,
} from "@/modules/production/queries";

/**
 * Production Pipeline Page - Server Component
 *
 * Story: 18.1 - Create Production Projects
 * AC-18.1.4: View list of production projects
 * AC-18.1.5: View production project details
 */

export const metadata = {
  title: "Production | Salina ERP",
  description: "Manage production projects for your publishing pipeline",
};

export default async function ProductionPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Authors role should not access this page
  if (user.role === "author") {
    redirect("/portal");
  }

  // Fetch initial data (Server-side)
  const [projects, availableTitles] = await Promise.all([
    getProductionProjects(),
    getAvailableTitlesForProduction(),
  ]);

  return (
    <>
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Production Pipeline
        </h1>
        <p className="text-muted-foreground">
          Manage production projects for your titles
        </p>
      </div>

      {/* Split View */}
      <ProductionSplitView
        initialProjects={projects}
        availableTitles={availableTitles}
      />
    </>
  );
}
