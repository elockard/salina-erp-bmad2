/**
 * OAuth2 Token Endpoint
 *
 * Story 15.1 - AC3: OAuth2 client_credentials flow
 * Story 15.3 - AC7: Stricter auth endpoint rate limiting
 * Reference: RFC 6749 Section 4.4
 *
 * POST /api/v1/auth/token
 * Content-Type: application/json
 *
 * {
 *   "grant_type": "client_credentials",
 *   "client_id": "sk_live_xxx",
 *   "client_secret": "secret"
 * }
 */

import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db";
import { apiKeys } from "@/db/schema/api-keys";
import { verifyApiSecret } from "@/modules/api/auth/api-key-service";
import { generateAccessToken } from "@/modules/api/auth/token-service";
import { checkAuthEndpointRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Story 15.3 - AC7: Stricter IP-based rate limiting for auth endpoint
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rateLimit = await checkAuthEndpointRateLimit(clientIp);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  try {
    const body = await request.json();

    // Validate grant type
    if (body.grant_type !== "client_credentials") {
      return addRateLimitHeaders(
        NextResponse.json(
          {
            error: "unsupported_grant_type",
            error_description:
              "Only client_credentials grant type is supported",
          },
          { status: 400 },
        ),
        rateLimit.state,
      );
    }

    // Validate required fields
    if (!body.client_id || !body.client_secret) {
      return addRateLimitHeaders(
        NextResponse.json(
          {
            error: "invalid_request",
            error_description: "client_id and client_secret are required",
          },
          { status: 400 },
        ),
        rateLimit.state,
      );
    }

    // Find API key by key ID
    const apiKey = await adminDb.query.apiKeys.findFirst({
      where: and(eq(apiKeys.keyId, body.client_id), isNull(apiKeys.revokedAt)),
    });

    if (!apiKey) {
      // Log failed attempt for security monitoring (AC5)
      console.warn(`[API Auth] Failed auth attempt for key: ${body.client_id}`);

      return addRateLimitHeaders(
        NextResponse.json(
          {
            error: "invalid_grant",
            error_description: "API key not found or revoked",
          },
          { status: 401 },
        ),
        rateLimit.state,
      );
    }

    // Verify secret
    const isValid = await verifyApiSecret(
      body.client_secret,
      apiKey.secretHash,
    );
    if (!isValid) {
      console.warn(`[API Auth] Invalid secret for key: ${body.client_id}`);

      return addRateLimitHeaders(
        NextResponse.json(
          {
            error: "invalid_grant",
            error_description: "Invalid API secret",
          },
          { status: 401 },
        ),
        rateLimit.state,
      );
    }

    // Generate JWT access token
    const accessToken = await generateAccessToken(
      apiKey.tenantId,
      apiKey.keyId,
      apiKey.scopes,
    );

    // Update last used (fire and forget)
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

    // Return OAuth2 token response with rate limit headers
    return addRateLimitHeaders(
      NextResponse.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 900, // 15 minutes in seconds
      }),
      rateLimit.state,
    );
  } catch (error) {
    console.error("[API Auth] Token endpoint error:", error);

    return addRateLimitHeaders(
      NextResponse.json(
        {
          error: "server_error",
          error_description: "Internal server error",
        },
        { status: 500 },
      ),
      rateLimit.state,
    );
  }
}
