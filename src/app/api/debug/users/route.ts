"use server";

import { NextResponse } from "next/server";
import { adminDb } from "@/db";

// Debug endpoint - remove in production
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const allUsers = await adminDb.query.users.findMany({
      columns: {
        id: true,
        tenant_id: true,
        clerk_user_id: true,
        email: true,
        role: true,
      },
    });

    const allTenants = await adminDb.query.tenants.findMany({
      columns: {
        id: true,
        subdomain: true,
        name: true,
      },
    });

    return NextResponse.json({
      users: allUsers,
      tenants: allTenants,
      message:
        "Compare your Clerk userId (user_35rqIjoXQZkhEWkPciKgo6XtIlO) with clerk_user_id values",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
