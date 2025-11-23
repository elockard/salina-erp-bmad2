import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { adminDb } from "@/db";
import { tenants } from "@/db/schema/tenants";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Extract subdomain from host header
  const host = req.headers.get("host") || "";
  const parts = host.split(".");

  // For localhost, expect format: tenant.localhost:3000
  // For production, expect format: tenant.salina-erp.com
  const subdomain = parts.length > 1 ? parts[0] : null;

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
