import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { adminDb } from "@/db";
import { tenants } from "@/db/schema/tenants";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
  "/portal(.*)", // Story 2.3: Author portal routes
  "/sales(.*)", // Story 3.2: Sales entry routes
  "/authors(.*)",
  "/titles(.*)",
  "/isbn-pool(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Extract subdomain from host header
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0]; // Remove port if present (localhost:3000 → localhost)
  const parts = hostname.split(".");

  console.log(
    `[Middleware] ${req.method} ${req.nextUrl.pathname} | host: ${hostname}`,
  );

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

  // Fallback: If no subdomain found, check Clerk session metadata (dev mode convenience)
  // This allows authenticated users to access their tenant without subdomain routing
  if (!subdomain && isProtectedRoute(req)) {
    try {
      const { sessionClaims } = await auth();
      if (sessionClaims?.publicMetadata) {
        const metadata = sessionClaims.publicMetadata as { subdomain?: string };
        subdomain = metadata.subdomain || null;
      }
    } catch (error) {
      // If we can't read session, continue without subdomain
      console.debug("Could not read session for subdomain fallback:", error);
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

      // Pass both tenant_id and JWT to Server Actions
      const response = NextResponse.next();
      response.headers.set("x-tenant-id", tenant.id);

      // Store JWT for database authentication (enables auth.user_id() in RLS)
      if (token) {
        response.headers.set("x-clerk-jwt", token);
      }

      // Protect authenticated routes
      if (isProtectedRoute(req)) {
        await auth.protect();
      }

      return response;
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
