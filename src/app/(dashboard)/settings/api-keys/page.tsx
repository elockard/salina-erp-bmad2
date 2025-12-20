import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiKeysManager } from "@/modules/api/components/api-keys-manager";

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
        <p className="text-muted-foreground">
          Manage API keys for programmatic access to Salina. Keys use OAuth2
          client_credentials flow.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ApiKeysManager />
      </Suspense>
    </div>
  );
}
