/**
 * One-time migration script to remove ISBN type distinction
 * Story 7.6 - Remove ISBN Type Distinction
 *
 * Run with: node scripts/apply-isbn-type-removal-migration.mjs
 *
 * This migration:
 * 1. Sets all isbns.type values to NULL
 * 2. Sets all isbn_prefixes.type values to NULL
 * 3. Migrates titles.eisbn values to titles.isbn where isbn is NULL
 * 4. Clears titles.eisbn after migration
 *
 * Safe to run multiple times - idempotent operations.
 */

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables
config();

const sql = neon(process.env.DATABASE_URL);

async function applyMigration() {
  console.log("Story 7.6: Remove ISBN Type Distinction Migration\n");

  try {
    // Pre-migration stats
    console.log("Pre-migration status:");

    const isbnTypeCount = await sql`
      SELECT COUNT(*) as count FROM isbns WHERE type IS NOT NULL;
    `;
    console.log(`  - ISBNs with type set: ${isbnTypeCount[0].count}`);

    const prefixTypeCount = await sql`
      SELECT COUNT(*) as count FROM isbn_prefixes WHERE type IS NOT NULL;
    `;
    console.log(`  - ISBN Prefixes with type set: ${prefixTypeCount[0].count}`);

    const titlesWithEisbn = await sql`
      SELECT COUNT(*) as count FROM titles WHERE eisbn IS NOT NULL;
    `;
    console.log(`  - Titles with eisbn: ${titlesWithEisbn[0].count}`);

    const titlesWithEisbnNoIsbn = await sql`
      SELECT COUNT(*) as count FROM titles WHERE eisbn IS NOT NULL AND isbn IS NULL;
    `;
    console.log(
      `  - Titles with eisbn but no isbn: ${titlesWithEisbnNoIsbn[0].count}`,
    );

    console.log("\nApplying migration...\n");

    // Read and execute the migration
    const migrationSQL = readFileSync(
      "./drizzle/migrations/0014_remove_isbn_type_distinction.sql",
      "utf8",
    );

    // Split by statement-breakpoint and execute each
    const statements = migrationSQL.split("--> statement-breakpoint");

    for (const stmt of statements) {
      const cleaned = stmt.trim();
      // Skip empty statements, comments-only blocks, and the header block
      if (
        cleaned &&
        !cleaned.startsWith("--") &&
        !cleaned.startsWith("/*") &&
        !cleaned.startsWith("*")
      ) {
        const preview = cleaned.substring(0, 80).replace(/\n/g, " ");
        console.log(`Executing: ${preview}...`);
        try {
          await sql.unsafe(cleaned);
          console.log("  ✓ Success");
        } catch (err) {
          // Log but continue for non-critical errors
          if (err.message.includes("does not exist")) {
            console.log("  ⚠️ Column/table does not exist, skipping");
          } else {
            console.error("  ❌ Error:", err.message);
            throw err;
          }
        }
      }
    }

    // Post-migration stats
    console.log("\nPost-migration status:");

    const isbnTypeCountAfter = await sql`
      SELECT COUNT(*) as count FROM isbns WHERE type IS NOT NULL;
    `;
    console.log(`  - ISBNs with type set: ${isbnTypeCountAfter[0].count}`);

    const prefixTypeCountAfter = await sql`
      SELECT COUNT(*) as count FROM isbn_prefixes WHERE type IS NOT NULL;
    `;
    console.log(
      `  - ISBN Prefixes with type set: ${prefixTypeCountAfter[0].count}`,
    );

    const titlesWithEisbnAfter = await sql`
      SELECT COUNT(*) as count FROM titles WHERE eisbn IS NOT NULL;
    `;
    console.log(`  - Titles with eisbn: ${titlesWithEisbnAfter[0].count}`);

    console.log("\n✅ Migration completed successfully!");
    console.log("ISBN type distinction has been removed.");
    console.log("Columns are preserved for rollback capability.");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  }
}

applyMigration();
