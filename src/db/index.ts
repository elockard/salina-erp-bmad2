import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Admin connection for migrations, Studio, and non-RLS queries (tenant lookup)
const adminSql = neon(process.env.DATABASE_URL!);
export const adminDb = drizzle(adminSql, { schema });

// Authenticated connection for app queries with RLS enforcement
const authSql = neon(process.env.DATABASE_AUTHENTICATED_URL!);
export const db = drizzle(authSql, { schema });

/**
 * Get database client with JWT authentication for RLS enforcement
 * Uses Neon Authorize to validate JWT and populate auth.user_id()
 * @param authToken - Clerk JWT token from middleware
 */
export function getAuthenticatedDb(authToken: string) {
  const sql = neon(process.env.DATABASE_AUTHENTICATED_URL!, {
    authToken, // Pass JWT to enable auth.user_id() in RLS policies
  });
  return drizzle(sql, { schema });
}
