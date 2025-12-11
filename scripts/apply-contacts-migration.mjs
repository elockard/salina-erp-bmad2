/**
 * Apply contacts schema and contact_id columns migration
 * Run with: node scripts/apply-contacts-migration.mjs
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config();

const sql = neon(process.env.DATABASE_URL);

async function applyMigration() {
  try {
    // Check if contacts table exists
    const contactsCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'contacts'
      );
    `;

    if (contactsCheck[0].exists) {
      console.log("✅ Table contacts already exists");
    } else {
      console.log("⚠️  Table contacts does NOT exist. Creating...");

      // Create contacts table
      await sql`
        CREATE TABLE "contacts" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "tenant_id" uuid NOT NULL,
          "first_name" text NOT NULL,
          "last_name" text NOT NULL,
          "email" text,
          "phone" text,
          "address_line1" text,
          "address_line2" text,
          "city" text,
          "state" text,
          "postal_code" text,
          "country" text DEFAULT 'USA',
          "tax_id" text,
          "payment_info" jsonb,
          "notes" text,
          "status" text DEFAULT 'active' NOT NULL,
          "portal_user_id" uuid,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
          "created_by" uuid,
          CONSTRAINT "contacts_tenant_email_unique" UNIQUE("tenant_id","email"),
          CONSTRAINT "contacts_portal_user_unique" UNIQUE("portal_user_id"),
          CONSTRAINT "contacts_status_valid" CHECK (status IN ('active', 'inactive'))
        )
      `;
      console.log("  ✓ contacts table created");

      // Create contact_roles table
      await sql`
        CREATE TABLE "contact_roles" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "contact_id" uuid NOT NULL,
          "role" text NOT NULL,
          "role_specific_data" jsonb,
          "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
          "assigned_by" uuid,
          CONSTRAINT "contact_roles_contact_role_unique" UNIQUE("contact_id","role"),
          CONSTRAINT "contact_roles_role_valid" CHECK (role IN ('author', 'customer', 'vendor', 'distributor'))
        )
      `;
      console.log("  ✓ contact_roles table created");

      // Add foreign keys
      await sql`ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action`;
      await sql`ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action`;
      console.log("  ✓ Foreign keys added");

      // Add indexes
      await sql`CREATE INDEX "contacts_tenant_id_idx" ON "contacts" USING btree ("tenant_id")`;
      await sql`CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email")`;
      await sql`CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status")`;
      await sql`CREATE INDEX "contact_roles_contact_id_idx" ON "contact_roles" USING btree ("contact_id")`;
      await sql`CREATE INDEX "contact_roles_role_idx" ON "contact_roles" USING btree ("role")`;
      console.log("  ✓ Indexes created");

      // Grant permissions to authenticated role
      await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON "contacts" TO authenticated`;
      await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON "contact_roles" TO authenticated`;
      console.log("  ✓ Permissions granted to authenticated role");
    }

    // Check if contact_id column exists in titles
    const contactIdCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'titles' AND column_name = 'contact_id'
      );
    `;

    if (contactIdCheck[0].exists) {
      console.log("✅ Column titles.contact_id already exists");
    } else {
      console.log("⚠️  Column titles.contact_id does NOT exist. Adding...");

      // Add contact_id columns
      await sql`ALTER TABLE "titles" ADD COLUMN "contact_id" uuid`;
      await sql`ALTER TABLE "contracts" ADD COLUMN "contact_id" uuid`;
      await sql`ALTER TABLE "statements" ADD COLUMN "contact_id" uuid`;
      console.log(
        "  ✓ contact_id columns added to titles, contracts, statements",
      );

      // Add foreign keys (referencing contacts table)
      await sql`ALTER TABLE "titles" ADD CONSTRAINT "titles_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action`;
      await sql`ALTER TABLE "contracts" ADD CONSTRAINT "contracts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action`;
      await sql`ALTER TABLE "statements" ADD CONSTRAINT "statements_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action`;
      console.log("  ✓ Foreign keys added");

      // Add indexes
      await sql`CREATE INDEX "titles_contact_id_idx" ON "titles" USING btree ("contact_id")`;
      await sql`CREATE INDEX "contracts_contact_id_idx" ON "contracts" USING btree ("contact_id")`;
      await sql`CREATE INDEX "statements_contact_id_idx" ON "statements" USING btree ("contact_id")`;
      console.log("  ✓ Indexes created");
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

applyMigration();
