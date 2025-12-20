/**
 * JWT Token Service
 *
 * Story 15.1 - AC3: OAuth2 Token Endpoint
 * Story 15.1 - AC4: Token Validation
 *
 * Security:
 * - JWT signed with HS256
 * - 15-minute expiry per architecture spec
 * - Contains tenant_id, key_id, scopes claims
 */

import { type JWTPayload, jwtVerify, SignJWT } from "jose";

// API_JWT_SECRET must be set - do not fall back to CLERK_SECRET_KEY for security
const apiJwtSecret = process.env.API_JWT_SECRET;
if (!apiJwtSecret && process.env.NODE_ENV === "production") {
  throw new Error(
    "API_JWT_SECRET environment variable is required in production",
  );
}
const JWT_SECRET = new TextEncoder().encode(
  apiJwtSecret || process.env.CLERK_SECRET_KEY, // Dev fallback only
);
const JWT_ISSUER = "salina-erp";
const JWT_AUDIENCE = "salina-api";
const TOKEN_EXPIRY = "15m"; // 15 minutes per architecture spec

/**
 * JWT payload for API access tokens
 */
export interface ApiTokenPayload extends JWTPayload {
  tenant_id: string;
  key_id: string;
  scopes: string[];
}

/**
 * Generate JWT access token
 *
 * Story 15.1 - AC3: OAuth2 Token Endpoint
 */
export async function generateAccessToken(
  tenantId: string,
  keyId: string,
  scopes: string[],
): Promise<string> {
  const token = await new SignJWT({
    tenant_id: tenantId,
    key_id: keyId,
    scopes,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode JWT access token
 *
 * Story 15.1 - AC4: Token Validation
 */
export async function verifyAccessToken(
  token: string,
): Promise<ApiTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as ApiTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}
