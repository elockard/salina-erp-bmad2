import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { users } from "@/db/schema";
import {
  CHANNEL_TYPES,
  channelCredentials,
} from "@/db/schema/channel-credentials";

/**
 * Shared Channel Queries
 *
 * Story 16.1 - Configure Ingram Account Connection
 * Provides aggregated status for all channel integrations
 */

export interface ChannelStatuses {
  ingram: boolean;
  amazon: boolean;
}

/**
 * Get the connection status for all configured channels
 *
 * @returns Object with boolean status for each channel
 */
export async function getChannelStatuses(): Promise<ChannelStatuses> {
  const { userId } = await auth();

  if (!userId) {
    return { ingram: false, amazon: false };
  }

  // Get user's tenant
  const user = await adminDb.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) {
    return { ingram: false, amazon: false };
  }

  // Get all channel credentials for this tenant
  const credentials = await adminDb.query.channelCredentials.findMany({
    where: eq(channelCredentials.tenantId, user.tenant_id),
  });

  // Build status object
  const statuses: ChannelStatuses = {
    ingram: false,
    amazon: false,
  };

  for (const cred of credentials) {
    if (cred.channel === CHANNEL_TYPES.INGRAM && cred.status === "active") {
      statuses.ingram = true;
    }
    if (cred.channel === CHANNEL_TYPES.AMAZON && cred.status === "active") {
      statuses.amazon = true;
    }
  }

  return statuses;
}
