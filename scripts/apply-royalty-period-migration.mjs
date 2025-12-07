#!/usr/bin/env node
/**
 * Apply royalty period columns to tenants table
 * Story 7.5 migration
 */
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const sql = neon(process.env.DATABASE_URL);

async function applyMigration() {
  console.log('Applying royalty period columns migration...');

  try {
    // Check if columns already exist
    const existing = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenants'
      AND column_name = 'royalty_period_type'
    `;

    if (existing.length > 0) {
      console.log('Columns already exist, skipping...');
      return;
    }

    // Add columns
    await sql`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "royalty_period_type" text DEFAULT 'fiscal_year' NOT NULL
    `;
    console.log('✓ Added royalty_period_type column');

    await sql`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "royalty_period_start_month" integer
    `;
    console.log('✓ Added royalty_period_start_month column');

    await sql`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "royalty_period_start_day" integer
    `;
    console.log('✓ Added royalty_period_start_day column');

    console.log('\n✅ Migration complete');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
