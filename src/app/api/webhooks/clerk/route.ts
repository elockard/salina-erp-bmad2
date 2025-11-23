import type { WebhookEvent } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { adminDb } from "@/db";
import { tenants } from "@/db/schema/tenants";
import { users } from "@/db/schema/users";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set in environment variables");
  }

  // Get headers for signature verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get request body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle user.created event
  if (evt.type === "user.created") {
    const { id, email_addresses, public_metadata } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      console.error("No email address found in user.created event");
      return new Response("No email address", { status: 400 });
    }

    try {
      // Check if user already exists (webhook retry scenario)
      const existingUser = await adminDb.query.users.findFirst({
        where: eq(users.clerk_user_id, id),
      });

      if (existingUser) {
        console.log("User already exists, skipping creation:", id);
        return new Response("User already exists", { status: 200 });
      }

      // Extract tenant info from public_metadata
      // For MVP: First user creates new tenant, invited users link to existing tenant
      const metadata = public_metadata as {
        tenant_id?: string;
        role?: string;
        tenant_name?: string;
        tenant_subdomain?: string;
      };

      let tenant_id = metadata.tenant_id;

      // If no tenant_id in metadata, this is a new tenant owner signup
      if (!tenant_id) {
        // Create new tenant for owner
        const tenantName = metadata.tenant_name || "New Company";
        const subdomain = metadata.tenant_subdomain || `tenant-${Date.now()}`;

        const [newTenant] = await adminDb
          .insert(tenants)
          .values({
            name: tenantName,
            subdomain: subdomain,
          })
          .returning();

        tenant_id = newTenant.id;
      }

      // Create user record
      await adminDb.insert(users).values({
        clerk_user_id: id,
        email: email,
        tenant_id: tenant_id,
        role: (metadata.role as any) || "owner", // Default to owner for first user
        is_active: true,
      });

      console.log("User created successfully:", { id, email, tenant_id });
      return new Response("User created", { status: 200 });
    } catch (error) {
      console.error("Error creating user:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }

  // Handle user.updated event
  if (evt.type === "user.updated") {
    const { id, email_addresses } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      return new Response("No email address", { status: 400 });
    }

    try {
      // Update user email if changed
      await adminDb
        .update(users)
        .set({
          email: email,
          updated_at: new Date(),
        })
        .where(eq(users.clerk_user_id, id));

      console.log("User updated successfully:", { id, email });
      return new Response("User updated", { status: 200 });
    } catch (error) {
      console.error("Error updating user:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }

  // Handle user.deleted event
  if (evt.type === "user.deleted") {
    const { id } = evt.data;

    try {
      // Soft delete - set is_active to false
      await adminDb
        .update(users)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(eq(users.clerk_user_id, id as string));

      console.log("User deactivated successfully:", id);
      return new Response("User deactivated", { status: 200 });
    } catch (error) {
      console.error("Error deactivating user:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }

  return new Response("Event not handled", { status: 200 });
}
