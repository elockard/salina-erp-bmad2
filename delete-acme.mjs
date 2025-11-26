import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// Delete users first (foreign key constraint)
const deletedUsers =
  await sql`DELETE FROM users WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = 'acme') RETURNING id, email`;
console.log("Deleted users:", deletedUsers);

// Delete tenant
const deletedTenant =
  await sql`DELETE FROM tenants WHERE subdomain = 'acme' RETURNING id, subdomain, name`;
console.log("Deleted tenant:", deletedTenant);
