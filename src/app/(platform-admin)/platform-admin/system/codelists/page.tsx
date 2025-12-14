/**
 * Codelist Management Page
 *
 * Story 14.4: Build Codelist Management System (AC: 1, 2, 3)
 *
 * Server component that displays loaded codelists and provides
 * update controls for platform administrators.
 */

import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  checkCodelistsLoaded,
  getCodelists,
} from "@/modules/onix/codelists/actions";
import { CodelistAdminClient } from "./client";

export default async function CodelistManagementPage() {
  await requirePlatformAdmin();

  const [codelists, loadedStatus] = await Promise.all([
    getCodelists(),
    checkCodelistsLoaded(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-3xl font-bold text-white">
        EDItEUR Codelist Management
      </h1>
      <p className="mb-8 text-slate-400">
        Manage ONIX codelists for validation and display
      </p>

      <CodelistAdminClient
        initialCodelists={codelists}
        initialLoadedStatus={loadedStatus}
      />
    </div>
  );
}
