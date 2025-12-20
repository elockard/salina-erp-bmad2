/**
 * Contacts API - Single Contact Operations
 *
 * Story 15.2 - Task 3
 * AC5: GET/PUT /api/v1/contacts/:id
 */

import { and, eq } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/db";
import { contactStatusValues, contacts } from "@/db/schema/contacts";
import {
  authenticateApiRequest,
  requireScope,
} from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import {
  apiError,
  apiSuccess,
  notFound,
  validationError,
} from "@/modules/api/utils/response";
import { sanitizeContact } from "@/modules/api/utils/sanitize";

/**
 * Update contact validation schema
 */
const updateContactSchema = z.object({
  // Name
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),

  // Contact info
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),

  // Address
  address_line1: z.string().max(200).optional().nullable(),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional(),

  // Status
  status: z.enum(contactStatusValues).optional(),

  // Notes
  notes: z.string().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/contacts/:id
 *
 * AC5: Get single contact with full details
 * AC8: Tenant isolation - returns 404 for wrong tenant
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return notFound("Contact");
  }

  // Authenticate
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // Story 15.3: Rate limit check
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const tenantId = authResult.context.tenantId;

  try {
    // Fetch contact with tenant isolation
    const contact = await adminDb.query.contacts.findFirst({
      where: and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)),
      with: {
        roles: true,
      },
    });

    // AC8: Return 404 for not found OR wrong tenant
    if (!contact) {
      return addRateLimitHeaders(notFound("Contact"), rateLimit.state);
    }

    // Transform response with sanitization (AC5: exclude sensitive fields)
    const sanitized = sanitizeContact(contact);
    const transformed = {
      ...sanitized,
      roles:
        contact.roles?.map((r) => ({
          role: r.role,
          assigned_at: r.assigned_at,
        })) || [],
    };

    const response = apiSuccess({ data: transformed });
    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] GET /api/v1/contacts/:id error:", error);
    return addRateLimitHeaders(
      apiError("server_error", "Failed to fetch contact", 500),
      rateLimit.state,
    );
  }
}

/**
 * PUT /api/v1/contacts/:id
 *
 * AC5: Update contact with partial updates
 * AC8: Tenant isolation
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return notFound("Contact");
  }

  // Authenticate
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // Story 15.3: Rate limit check
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "write");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const tenantId = authResult.context.tenantId;

  try {
    const body = await request.json();
    const validation = updateContactSchema.safeParse(body);

    if (!validation.success) {
      return addRateLimitHeaders(
        validationError(
          Object.fromEntries(
            validation.error.issues.map((e) => [e.path.join("."), e.message]),
          ),
        ),
        rateLimit.state,
      );
    }

    // Check contact exists and belongs to tenant
    const existing = await adminDb.query.contacts.findFirst({
      where: and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)),
    });

    if (!existing) {
      return addRateLimitHeaders(notFound("Contact"), rateLimit.state);
    }

    // Update contact
    const updateData = {
      ...validation.data,
      updated_at: new Date(),
    };

    const [updated] = await adminDb
      .update(contacts)
      .set(updateData)
      .where(and(eq(contacts.id, id), eq(contacts.tenant_id, tenantId)))
      .returning();

    // Fetch with roles for response
    const contactWithRoles = await adminDb.query.contacts.findFirst({
      where: eq(contacts.id, id),
      with: {
        roles: true,
      },
    });

    // Sanitize response
    const sanitized = sanitizeContact(updated);
    const transformed = {
      ...sanitized,
      roles:
        contactWithRoles?.roles?.map((r) => ({
          role: r.role,
          assigned_at: r.assigned_at,
        })) || [],
    };

    const response = apiSuccess({ data: transformed });
    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] PUT /api/v1/contacts/:id error:", error);

    if (
      error instanceof Error &&
      error.message.includes("unique constraint") &&
      error.message.includes("email")
    ) {
      return addRateLimitHeaders(
        validationError({ email: "Email already exists for this tenant" }),
        rateLimit.state,
      );
    }

    return addRateLimitHeaders(
      apiError("server_error", "Failed to update contact", 500),
      rateLimit.state,
    );
  }
}
