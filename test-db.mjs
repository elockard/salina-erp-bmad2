import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

try {
  // List all tables
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;

  console.log("Tables in database:");
  console.log(tables);

  // Try to create the users table
  console.log("\nAttempting to create tables...");
  await sql`
    CREATE TABLE IF NOT EXISTS "tenants" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "subdomain" text NOT NULL,
      "name" text NOT NULL,
      "timezone" text DEFAULT 'America/New_York' NOT NULL,
      "fiscal_year_start" date,
      "default_currency" text DEFAULT 'USD' NOT NULL,
      "statement_frequency" text DEFAULT 'quarterly' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain")
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "tenant_id" uuid NOT NULL,
      "clerk_user_id" text NOT NULL,
      "email" text NOT NULL,
      "role" text NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
    )
  `;

  console.log("Tables created successfully!");

  // List tables again
  const tablesAfter = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;

  console.log("\nTables after creation:");
  console.log(tablesAfter);
} catch (error) {
  console.error("Error:", error);
}
