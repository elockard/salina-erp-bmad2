import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Validate required environment variables
const databaseUrl = process.env.DATABASE_URL;
const databaseAuthenticatedUrl = process.env.DATABASE_AUTHENTICATED_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

if (!databaseAuthenticatedUrl) {
  throw new Error(
    "DATABASE_AUTHENTICATED_URL environment variable is required",
  );
}

// Admin connection for migrations, Studio, and non-RLS queries (tenant lookup)
const adminSql = neon(databaseUrl);
export const adminDb = drizzle(adminSql, { schema });

// Authenticated connection for app queries with RLS enforcement
if (!databaseAuthenticatedUrl) {
  throw new Error(
    "DATABASE_AUTHENTICATED_URL environment variable is required",
  );
}
const authSql = neon(databaseAuthenticatedUrl);
export const db = drizzle(authSql, { schema });

/**
 * Get database client with JWT authentication for RLS enforcement
 * Uses Neon Authorize to validate JWT and populate auth.user_id()
 * @param authToken - Clerk JWT token from middleware
 */
export function getAuthenticatedDb(authToken: string) {
  if (!databaseAuthenticatedUrl) {
    throw new Error(
      "DATABASE_AUTHENTICATED_URL environment variable is required",
    );
  }
  const sql = neon(databaseAuthenticatedUrl, {
    authToken, // Pass JWT to enable auth.user_id() in RLS policies
  });
  return drizzle(sql, { schema });
}
