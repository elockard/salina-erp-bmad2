import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { adminDb } from "@/db";
import { tenants } from "@/db/schema/tenants";
import { users } from "@/db/schema/users";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
  "/portal(.*)", // Story 2.3: Author portal routes
  "/sales(.*)", // Story 3.2: Sales entry routes
  "/authors(.*)",
  "/titles(.*)",
  "/isbn-pool(.*)",
  "/returns(.*)", // Story 3.5-3.7: Returns module routes
]);

export default clerkMiddleware(async (auth, req) => {
  // Extract subdomain from host header
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0]; // Remove port if present (localhost:3000 → localhost)
  const parts = hostname.split(".");

  // Subdomain extraction logic:
  // localhost               → parts = ['localhost'] → subdomain = null (apex/public)
  // acme.localhost          → parts = ['acme', 'localhost'] → subdomain = 'acme'
  // salina.media            → parts = ['salina', 'media'] → subdomain = null (apex/public)
  // acme.salina.media       → parts = ['acme', 'salina', 'media'] → subdomain = 'acme'
  let subdomain = parts.length >= 3 ? parts[0] : null;

  // Development bypass: allow testing with single-domain localhost
  // If localhost with no subdomain, check for x-test-tenant header (for dev/testing)
  if (
    !subdomain &&
    hostname === "localhost" &&
    process.env.NODE_ENV === "development"
  ) {
    subdomain = req.headers.get("x-test-tenant") || null;
  }

  // Fallback: If no subdomain found, look up user's tenant from database
  // This allows authenticated users to access their tenant without subdomain routing
  if (!subdomain && isProtectedRoute(req)) {
    console.log("[Proxy] Fallback: No subdomain, looking up user tenant...");
    try {
      const { userId } = await auth();
      console.log("[Proxy] Fallback: Clerk userId =", userId);

      if (userId) {
        // Look up user's tenant from database using their Clerk ID
        const user = await adminDb.query.users.findFirst({
          where: eq(users.clerk_user_id, userId),
        });
        console.log("[Proxy] Fallback: DB user lookup result =", user ? { id: user.id, tenant_id: user.tenant_id, clerk_user_id: user.clerk_user_id } : null);

        if (user?.tenant_id) {
          // Look up tenant subdomain
          const tenant = await adminDb.query.tenants.findFirst({
            where: eq(tenants.id, user.tenant_id),
          });
          console.log("[Proxy] Fallback: Tenant lookup result =", tenant ? { id: tenant.id, subdomain: tenant.subdomain } : null);

          if (tenant) {
            subdomain = tenant.subdomain;
            console.log("[Proxy] Fallback: Set subdomain to", subdomain);
          }
        } else {
          console.log("[Proxy] Fallback: User not found in DB or has no tenant_id");
        }
      } else {
        console.log("[Proxy] Fallback: No Clerk userId (user not authenticated)");
      }
    } catch (error) {
      console.error("[Proxy] Fallback error:", error);
    }
  }

  if (subdomain) {
    try {
      // Use admin connection for tenant lookup (no RLS needed for this query)
      const tenant = await adminDb.query.tenants.findFirst({
        where: eq(tenants.subdomain, subdomain),
      });

      if (!tenant) {
        return NextResponse.redirect(new URL("/tenant-not-found", req.url));
      }

      // Get Clerk JWT token using the neon-authorize template
      const { getToken } = await auth();
      const token = await getToken({ template: "neon-authorize" });
      console.log("[Proxy] JWT from Clerk neon-authorize template:", token ? `present (${token.length} chars)` : "NULL");

      // Clone request headers and add tenant/JWT headers
      // Next.js 15+: Use request.headers option to pass headers to Server Components
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-tenant-id", tenant.id);

      // Store JWT for database authentication (enables auth.user_id() in RLS)
      if (token) {
        requestHeaders.set("x-clerk-jwt", token);
      }

      // Protect authenticated routes
      if (isProtectedRoute(req)) {
        await auth.protect();
      }

      // Return response with modified request headers (readable by Server Components)
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error("Middleware error:", error);
      // Fail closed - redirect to error page on any failure
      return NextResponse.redirect(new URL("/error", req.url));
    }
  }

  // Protect authenticated routes even without tenant
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
