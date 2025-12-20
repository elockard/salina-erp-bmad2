import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { CsvImportPage } from "@/modules/import-export/components/csv-import-page";

/**
 * CSV Import Page - Server Component
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 6.1: Create import page route
 *
 * FRs: FR170, FR171
 */

export const metadata = {
  title: "Import Titles | Salina ERP",
  description: "Import titles from CSV file",
};

export default async function TitlesImportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Authors role should not access this page
  if (user.role === "author") {
    redirect("/portal");
  }

  return <CsvImportPage />;
}
