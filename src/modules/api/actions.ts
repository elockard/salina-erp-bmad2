"use server";

/**
 * API Key Management Server Actions
 *
 * Story 15.1 - AC1: API Key Generation
 * Story 15.1 - AC2: API Key Management
 * Story 15.1 - AC6: Secure Storage
 */

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { adminDb, db } from "@/db";
import { users } from "@/db/schema";
import { type ApiScope, apiKeys } from "@/db/schema/api-keys";
import { logAuditEvent } from "@/lib/audit";
import { generateApiKeyPair } from "./auth/api-key-service";
import { clearRateLimitState } from "./middleware/rate-limiter";
import { type ApiKeyCreateInput, apiKeyCreateSchema } from "./schema";

/**
 * Get authenticated user with owner/admin check
 */
async function getAuthenticatedAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const user = await db.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) throw new Error("No tenant context");
  if (!["owner", "admin"].includes(user.role)) {
    throw new Error("Only owner/admin can manage API keys");
  }

  return user;
}

/**
 * Create new API key
 *
 * Story 15.1 - AC1: API Key Generation
 *
 * @returns Object with keyId and plaintextSecret (secret shown once only)
 */
export async function createApiKey(input: ApiKeyCreateInput): Promise<{
  success: boolean;
  keyId?: string;
  plaintextSecret?: string;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedAdmin();

    const validation = apiKeyCreateSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.message };
    }

    // Generate key pair
    const { keyId, plaintextSecret, secretHash } = await generateApiKeyPair(
      input.isTest ?? false,
    );

    // Insert key
    await db.insert(apiKeys).values({
      tenantId: user.tenant_id,
      name: input.name,
      description: input.description,
      keyId,
      secretHash,
      scopes: input.scopes as ApiScope[],
      isTest: input.isTest ?? false,
      createdBy: user.id,
    });

    // Fire-and-forget audit log
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "api_key",
      resourceId: keyId,
      changes: {
        after: {
          name: input.name,
          scopes: input.scopes,
          isTest: input.isTest ?? false,
        },
      },
    });

    revalidatePath("/settings/api-keys");

    // Return secret - THIS IS THE ONLY TIME IT CAN BE RETRIEVED
    return {
      success: true,
      keyId,
      plaintextSecret,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create API key",
    };
  }
}

/**
 * List API keys for current tenant
 *
 * Story 15.1 - AC2: API Key Management
 */
export async function listApiKeys(): Promise<{
  success: boolean;
  keys?: Array<{
    id: string;
    name: string;
    keyId: string;
    description: string | null;
    scopes: string[];
    isTest: boolean;
    createdAt: Date;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
  }>;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedAdmin();

    const keys = await adminDb.query.apiKeys.findMany({
      where: eq(apiKeys.tenantId, user.tenant_id),
      orderBy: [desc(apiKeys.createdAt)],
    });

    return {
      success: true,
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyId: k.keyId,
        description: k.description,
        scopes: k.scopes,
        isTest: k.isTest,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        revokedAt: k.revokedAt,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list API keys",
    };
  }
}

/**
 * Revoke API key (soft delete)
 *
 * Story 15.1 - AC2: Revoke keys
 */
export async function revokeApiKey(
  keyId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedAdmin();

    // Verify key belongs to tenant
    const key = await adminDb.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.keyId, keyId),
        eq(apiKeys.tenantId, user.tenant_id),
        isNull(apiKeys.revokedAt),
      ),
    });

    if (!key) {
      return { success: false, error: "API key not found or already revoked" };
    }

    await db
      .update(apiKeys)
      .set({
        revokedAt: new Date(),
        revokedBy: user.id,
      })
      .where(eq(apiKeys.id, key.id));

    // Clear rate limit state for this key (Story 15.3 - AC2)
    clearRateLimitState(user.tenant_id, keyId);

    // Fire-and-forget audit log
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "DELETE",
      resourceType: "api_key",
      resourceId: keyId,
      changes: {
        before: { name: key.name, active: true },
        after: {
          name: key.name,
          active: false,
          revokedAt: new Date().toISOString(),
        },
      },
    });

    revalidatePath("/settings/api-keys");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to revoke API key",
    };
  }
}
