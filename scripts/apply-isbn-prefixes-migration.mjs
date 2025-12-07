/**
 * One-time migration script to apply isbn_prefixes table
 * Run with: node scripts/apply-isbn-prefixes-migration.mjs
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const sql = neon(process.env.DATABASE_URL);

async function applyMigration() {
  try {
    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'isbn_prefixes'
      );
    `;

    if (tableCheck[0].exists) {
      console.log('✅ Table isbn_prefixes already exists');
      return;
    }

    console.log('⚠️  Table isbn_prefixes does NOT exist. Applying migration...');

    // Read and execute the migration
    const migrationSQL = readFileSync('./drizzle/migrations/0011_woozy_mesmero.sql', 'utf8');

    // Split by statement-breakpoint and execute each
    const statements = migrationSQL.split('--> statement-breakpoint');

    for (const stmt of statements) {
      const cleaned = stmt.trim();
      if (cleaned && !cleaned.startsWith('--')) {
        console.log('Executing:', cleaned.substring(0, 80) + '...');
        try {
          await sql.unsafe(cleaned);
          console.log('  ✓ Success');
        } catch (err) {
          // Skip "already exists" errors
          if (err.message.includes('already exists')) {
            console.log('  ⚠️ Already exists, skipping');
          } else {
            throw err;
          }
        }
      }
    }

    console.log('\n✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
