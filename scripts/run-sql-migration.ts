/**
 * Run custom SQL migration file
 * Usage: npx tsx scripts/run-sql-migration.ts <migration-file.sql>
 */

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables from .env file
config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error(
    "Usage: npx tsx scripts/run-sql-migration.ts <migration-file.sql>",
  );
  process.exit(1);
}

async function runMigration() {
  // databaseUrl is guaranteed to be defined here due to the check above
  const sql = neon(databaseUrl as string);

  console.log(`Reading migration file: ${migrationFile}`);
  const migrationContent = readFileSync(migrationFile, "utf-8");

  // Remove SQL comments (both single-line and block comments)
  const withoutComments = migrationContent
    .replace(/--[^\n]*/g, "") // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove block comments

  // Split on semicolons and filter empty statements
  const statements = withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Running ${statements.length} statements...`);

  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        console.log(`[${i + 1}/${statements.length}] Running statement...`);
        await sql.query(stmt);
      }
    }
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
