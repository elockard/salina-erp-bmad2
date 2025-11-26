import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const tenants =
  await sql`SELECT id, subdomain, name, created_at FROM tenants WHERE subdomain = 'acme'`;
console.log("Tenant:", JSON.stringify(tenants, null, 2));

if (tenants.length > 0) {
  const users =
    await sql`SELECT id, email, clerk_user_id, role FROM users WHERE tenant_id = ${tenants[0].id}`;
  console.log("\nUsers:", JSON.stringify(users, null, 2));
}
