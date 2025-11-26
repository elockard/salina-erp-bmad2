import { requirePermission } from "@/lib/auth";
import { MANAGE_SETTINGS } from "@/lib/permissions";
import { TenantSettingsForm } from "@/modules/tenant/components/tenant-settings-form";

export default async function TenantSettingsPage() {
  // Permission check: only Owner/Admin can access
  await requirePermission(MANAGE_SETTINGS);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <TenantSettingsForm />
    </div>
  );
}
