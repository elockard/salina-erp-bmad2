/**
 * API Authentication Middleware
 *
 * Story 15.1 - AC4: Token Validation
 * Story 15.1 - AC5: Authentication Failures
 *
 * Validates Bearer tokens in API requests and enforces scope requirements.
 */

import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db";
import { apiKeys } from "@/db/schema/api-keys";
import { extractBearerToken, verifyAccessToken } from "../auth/token-service";

/**
 * API request context after authentication
 */
export interface ApiContext {
  tenantId: string;
  keyId: string;
  scopes: string[];
}

/**
 * OAuth2 error response per RFC 6749
 */
function oauthError(
  error: string,
  description: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status },
  );
}

/**
 * Authenticate API request
 *
 * Story 15.1 - AC4: Token Validation
 */
export async function authenticateApiRequest(
  request: NextRequest,
): Promise<{ context: ApiContext } | { error: NextResponse }> {
  const authHeader = request.headers.get("Authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      error: oauthError(
        "invalid_request",
        "Missing or invalid Authorization header",
        401,
      ),
    };
  }

  // Verify JWT
  const payload = await verifyAccessToken(token);
  if (!payload) {
    return {
      error: oauthError("invalid_token", "Token is invalid or expired", 401),
    };
  }

  // Verify key is still active (not revoked)
  const apiKey = await adminDb.query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyId, payload.key_id), isNull(apiKeys.revokedAt)),
  });

  if (!apiKey) {
    return {
      error: oauthError("invalid_token", "API key has been revoked", 401),
    };
  }

  // Update last used timestamp (fire and forget)
  adminDb
    .update(apiKeys)
    .set({
      lastUsedAt: new Date(),
      lastUsedIp:
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
    })
    .where(eq(apiKeys.id, apiKey.id))
    .execute()
    .catch(console.error);

  return {
    context: {
      tenantId: payload.tenant_id,
      keyId: payload.key_id,
      scopes: payload.scopes,
    },
  };
}

/**
 * Check if context has required scope
 *
 * Story 15.1 - AC4: Scope checking
 */
export function hasScope(context: ApiContext, requiredScope: string): boolean {
  // Admin scope has all permissions
  if (context.scopes.includes("admin")) return true;
  // Write scope includes read
  if (requiredScope === "read" && context.scopes.includes("write")) return true;
  // Direct match
  return context.scopes.includes(requiredScope);
}

/**
 * Require scope middleware helper
 *
 * Story 15.1 - AC5: 403 Forbidden for insufficient scopes
 */
export function requireScope(
  context: ApiContext,
  requiredScope: string,
): NextResponse | null {
  if (!hasScope(context, requiredScope)) {
    return oauthError(
      "insufficient_scope",
      `This operation requires '${requiredScope}' scope`,
      403,
    );
  }
  return null;
}
