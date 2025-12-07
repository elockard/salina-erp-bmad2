#!/usr/bin/env npx tsx
/**
 * Author to Contact Migration Validation Script
 *
 * Story: 7.3 - Migrate Authors to Contacts
 * Task 0: Pre-Migration Validation
 *
 * This script validates the state of authors data before and after migration.
 * Run BEFORE migration to document current state.
 * Run AFTER migration to verify data integrity.
 *
 * Usage:
 *   pnpm tsx scripts/validate-author-migration.ts --mode pre
 *   pnpm tsx scripts/validate-author-migration.ts --mode post
 *   pnpm tsx scripts/validate-author-migration.ts --mode compare
 */

import { sql } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as fs from "node:fs";

// Load environment variables - try .env.local first, then .env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Import schemas
import { authors } from "../src/db/schema/authors";
import { contacts, contactRoles } from "../src/db/schema/contacts";
import { titles } from "../src/db/schema/titles";
import { contracts } from "../src/db/schema/contracts";
import { statements } from "../src/db/schema/statements";
import { decryptTaxId } from "../src/lib/encryption";

const SNAPSHOT_FILE = "scripts/migration-snapshot.json";

interface TenantCounts {
  tenant_id: string;
  author_count: number;
  titles_count: number;
  contracts_count: number;
  statements_count: number;
  [key: string]: unknown; // Index signature for Drizzle execute compatibility
}

interface MigrationSnapshot {
  timestamp: string;
  mode: "pre" | "post";
  total_authors: number;
  tenant_counts: TenantCounts[];
  fk_validation: {
    orphaned_titles: number;
    orphaned_contracts: number;
    orphaned_statements: number;
  };
  encryption_validation: {
    total_with_tax_id: number;
    decryption_successful: number;
    decryption_failed: number;
    failed_ids: string[];
  };
  portal_user_validation: {
    total_with_portal_user: number;
    unique_portal_users: number;
  };
}

async function main() {
  const args = process.argv.slice(2);
  const modeArg = args.find((a) => a.startsWith("--mode="));
  const mode = modeArg?.split("=")[1] || "pre";

  if (!["pre", "post", "compare"].includes(mode)) {
    console.error("Invalid mode. Use --mode=pre, --mode=post, or --mode=compare");
    process.exit(1);
  }

  if (mode === "compare") {
    await compareSnapshots();
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sqlClient = neon(databaseUrl);
  const db = drizzle(sqlClient);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Author Migration Validation - ${mode.toUpperCase()} mode`);
  console.log(`  ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}\n`);

  const snapshot: MigrationSnapshot = {
    timestamp: new Date().toISOString(),
    mode: mode as "pre" | "post",
    total_authors: 0,
    tenant_counts: [],
    fk_validation: {
      orphaned_titles: 0,
      orphaned_contracts: 0,
      orphaned_statements: 0,
    },
    encryption_validation: {
      total_with_tax_id: 0,
      decryption_successful: 0,
      decryption_failed: 0,
      failed_ids: [],
    },
    portal_user_validation: {
      total_with_portal_user: 0,
      unique_portal_users: 0,
    },
  };

  // 1. Count authors per tenant
  console.log("1. Counting authors per tenant...");
  if (mode === "pre") {
    const tenantCounts = await db.execute<TenantCounts>(sql`
      SELECT
        a.tenant_id,
        COUNT(DISTINCT a.id) as author_count,
        COUNT(DISTINCT t.id) as titles_count,
        COUNT(DISTINCT c.id) as contracts_count,
        COUNT(DISTINCT s.id) as statements_count
      FROM authors a
      LEFT JOIN titles t ON t.author_id = a.id
      LEFT JOIN contracts c ON c.author_id = a.id
      LEFT JOIN statements s ON s.author_id = a.id
      GROUP BY a.tenant_id
      ORDER BY a.tenant_id
    `);
    snapshot.tenant_counts = tenantCounts.rows as TenantCounts[];
    snapshot.total_authors = snapshot.tenant_counts.reduce(
      (sum, tc) => sum + Number(tc.author_count),
      0
    );
  } else {
    // Post-migration: count contacts with author role
    const tenantCounts = await db.execute<TenantCounts>(sql`
      SELECT
        c.tenant_id,
        COUNT(DISTINCT c.id) as author_count,
        COUNT(DISTINCT t.id) as titles_count,
        COUNT(DISTINCT con.id) as contracts_count,
        COUNT(DISTINCT s.id) as statements_count
      FROM contacts c
      INNER JOIN contact_roles cr ON cr.contact_id = c.id AND cr.role = 'author'
      LEFT JOIN titles t ON t.contact_id = c.id
      LEFT JOIN contracts con ON con.contact_id = c.id
      LEFT JOIN statements s ON s.contact_id = c.id
      GROUP BY c.tenant_id
      ORDER BY c.tenant_id
    `);
    snapshot.tenant_counts = tenantCounts.rows as TenantCounts[];
    snapshot.total_authors = snapshot.tenant_counts.reduce(
      (sum, tc) => sum + Number(tc.author_count),
      0
    );
  }

  console.log(`   Total authors: ${snapshot.total_authors}`);
  for (const tc of snapshot.tenant_counts) {
    console.log(`   Tenant ${tc.tenant_id.slice(0, 8)}...: ${tc.author_count} authors, ${tc.titles_count} titles, ${tc.contracts_count} contracts, ${tc.statements_count} statements`);
  }

  // 2. Verify FK integrity
  console.log("\n2. Verifying foreign key integrity...");
  if (mode === "pre") {
    const orphanedTitles = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*) as count FROM titles t
      WHERE NOT EXISTS (SELECT 1 FROM authors a WHERE a.id = t.author_id)
    `);
    const orphanedContracts = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*) as count FROM contracts c
      WHERE NOT EXISTS (SELECT 1 FROM authors a WHERE a.id = c.author_id)
    `);
    const orphanedStatements = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*) as count FROM statements s
      WHERE NOT EXISTS (SELECT 1 FROM authors a WHERE a.id = s.author_id)
    `);

    snapshot.fk_validation = {
      orphaned_titles: Number(orphanedTitles.rows[0]?.count || 0),
      orphaned_contracts: Number(orphanedContracts.rows[0]?.count || 0),
      orphaned_statements: Number(orphanedStatements.rows[0]?.count || 0),
    };
  } else {
    // Post-migration: check contact_id FKs
    const orphanedTitles = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*) as count FROM titles t
      WHERE t.contact_id IS NULL AND t.author_id IS NOT NULL
    `);
    const orphanedContracts = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*) as count FROM contracts c
      WHERE c.contact_id IS NULL AND c.author_id IS NOT NULL
    `);
    const orphanedStatements = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*) as count FROM statements s
      WHERE s.contact_id IS NULL AND s.author_id IS NOT NULL
    `);

    snapshot.fk_validation = {
      orphaned_titles: Number(orphanedTitles.rows[0]?.count || 0),
      orphaned_contracts: Number(orphanedContracts.rows[0]?.count || 0),
      orphaned_statements: Number(orphanedStatements.rows[0]?.count || 0),
    };
  }

  const totalOrphaned =
    snapshot.fk_validation.orphaned_titles +
    snapshot.fk_validation.orphaned_contracts +
    snapshot.fk_validation.orphaned_statements;

  if (totalOrphaned === 0) {
    console.log("   ✅ All FK references are valid");
  } else {
    console.log(`   ⚠️  Found orphaned records:`);
    console.log(`      - Titles: ${snapshot.fk_validation.orphaned_titles}`);
    console.log(`      - Contracts: ${snapshot.fk_validation.orphaned_contracts}`);
    console.log(`      - Statements: ${snapshot.fk_validation.orphaned_statements}`);
  }

  // 3. Validate tax_id encryption
  console.log("\n3. Validating tax_id encryption...");
  const sourceTable = mode === "pre" ? "authors" : "contacts";
  const authorsWithTaxId = await db.execute<{ id: string; tax_id: string }>(sql.raw(`
    SELECT id, tax_id FROM ${sourceTable} WHERE tax_id IS NOT NULL
  `));

  snapshot.encryption_validation.total_with_tax_id = authorsWithTaxId.rows.length;

  for (const row of authorsWithTaxId.rows) {
    try {
      const decrypted = decryptTaxId(row.tax_id);
      if (decrypted && decrypted.length > 0) {
        snapshot.encryption_validation.decryption_successful++;
      } else {
        snapshot.encryption_validation.decryption_failed++;
        snapshot.encryption_validation.failed_ids.push(row.id);
      }
    } catch (error) {
      snapshot.encryption_validation.decryption_failed++;
      snapshot.encryption_validation.failed_ids.push(row.id);
    }
  }

  if (snapshot.encryption_validation.decryption_failed === 0) {
    console.log(`   ✅ All ${snapshot.encryption_validation.total_with_tax_id} tax_id values decrypt successfully`);
  } else {
    console.log(`   ⚠️  Encryption validation results:`);
    console.log(`      - Total with tax_id: ${snapshot.encryption_validation.total_with_tax_id}`);
    console.log(`      - Successful: ${snapshot.encryption_validation.decryption_successful}`);
    console.log(`      - Failed: ${snapshot.encryption_validation.decryption_failed}`);
    console.log(`      - Failed IDs: ${snapshot.encryption_validation.failed_ids.join(", ")}`);
  }

  // 4. Validate portal_user_id uniqueness
  console.log("\n4. Validating portal_user_id uniqueness...");
  const portalUserStats = await db.execute<{ total: number; unique_count: number }>(sql.raw(`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT portal_user_id) as unique_count
    FROM ${sourceTable}
    WHERE portal_user_id IS NOT NULL
  `));

  snapshot.portal_user_validation = {
    total_with_portal_user: Number(portalUserStats.rows[0]?.total || 0),
    unique_portal_users: Number(portalUserStats.rows[0]?.unique_count || 0),
  };

  if (snapshot.portal_user_validation.total_with_portal_user === snapshot.portal_user_validation.unique_portal_users) {
    console.log(`   ✅ All ${snapshot.portal_user_validation.total_with_portal_user} portal_user_id values are unique`);
  } else {
    console.log(`   ⚠️  portal_user_id duplicates detected!`);
    console.log(`      - Total with portal_user_id: ${snapshot.portal_user_validation.total_with_portal_user}`);
    console.log(`      - Unique portal_user_ids: ${snapshot.portal_user_validation.unique_portal_users}`);
  }

  // Save snapshot
  const snapshotPath = mode === "pre" ? SNAPSHOT_FILE.replace(".json", "-pre.json") : SNAPSHOT_FILE.replace(".json", "-post.json");
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`\n📄 Snapshot saved to: ${snapshotPath}`);

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("  VALIDATION SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log(`  Mode: ${mode.toUpperCase()}`);
  console.log(`  Total Authors: ${snapshot.total_authors}`);
  console.log(`  FK Integrity: ${totalOrphaned === 0 ? "✅ PASS" : "⚠️  ISSUES"}`);
  console.log(`  Encryption: ${snapshot.encryption_validation.decryption_failed === 0 ? "✅ PASS" : "⚠️  ISSUES"}`);
  console.log(`  Portal Users: ${snapshot.portal_user_validation.total_with_portal_user === snapshot.portal_user_validation.unique_portal_users ? "✅ PASS" : "⚠️  ISSUES"}`);
  console.log(`${"=".repeat(60)}\n`);
}

async function compareSnapshots() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("  Comparing Pre and Post Migration Snapshots");
  console.log(`${"=".repeat(60)}\n`);

  const preSnapshot = JSON.parse(
    fs.readFileSync(SNAPSHOT_FILE.replace(".json", "-pre.json"), "utf-8")
  ) as MigrationSnapshot;
  const postSnapshot = JSON.parse(
    fs.readFileSync(SNAPSHOT_FILE.replace(".json", "-post.json"), "utf-8")
  ) as MigrationSnapshot;

  console.log("1. Author Count Comparison:");
  console.log(`   Pre-migration:  ${preSnapshot.total_authors}`);
  console.log(`   Post-migration: ${postSnapshot.total_authors}`);
  console.log(`   Status: ${preSnapshot.total_authors === postSnapshot.total_authors ? "✅ MATCH" : "❌ MISMATCH"}`);

  console.log("\n2. Per-Tenant Comparison:");
  for (const preTenant of preSnapshot.tenant_counts) {
    const postTenant = postSnapshot.tenant_counts.find(
      (t) => t.tenant_id === preTenant.tenant_id
    );
    if (postTenant) {
      const authorsMatch = Number(preTenant.author_count) === Number(postTenant.author_count);
      const titlesMatch = Number(preTenant.titles_count) === Number(postTenant.titles_count);
      const contractsMatch = Number(preTenant.contracts_count) === Number(postTenant.contracts_count);
      const statementsMatch = Number(preTenant.statements_count) === Number(postTenant.statements_count);

      console.log(`   Tenant ${preTenant.tenant_id.slice(0, 8)}...:`);
      console.log(`     Authors: ${preTenant.author_count} → ${postTenant.author_count} ${authorsMatch ? "✅" : "❌"}`);
      console.log(`     Titles: ${preTenant.titles_count} → ${postTenant.titles_count} ${titlesMatch ? "✅" : "❌"}`);
      console.log(`     Contracts: ${preTenant.contracts_count} → ${postTenant.contracts_count} ${contractsMatch ? "✅" : "❌"}`);
      console.log(`     Statements: ${preTenant.statements_count} → ${postTenant.statements_count} ${statementsMatch ? "✅" : "❌"}`);
    } else {
      console.log(`   Tenant ${preTenant.tenant_id.slice(0, 8)}...: ❌ NOT FOUND in post-migration`);
    }
  }

  console.log("\n3. FK Integrity:");
  console.log(`   Post-migration orphaned titles: ${postSnapshot.fk_validation.orphaned_titles} ${postSnapshot.fk_validation.orphaned_titles === 0 ? "✅" : "❌"}`);
  console.log(`   Post-migration orphaned contracts: ${postSnapshot.fk_validation.orphaned_contracts} ${postSnapshot.fk_validation.orphaned_contracts === 0 ? "✅" : "❌"}`);
  console.log(`   Post-migration orphaned statements: ${postSnapshot.fk_validation.orphaned_statements} ${postSnapshot.fk_validation.orphaned_statements === 0 ? "✅" : "❌"}`);

  console.log("\n4. Encryption:");
  console.log(`   Tax IDs with successful decryption: ${postSnapshot.encryption_validation.decryption_successful}/${postSnapshot.encryption_validation.total_with_tax_id} ${postSnapshot.encryption_validation.decryption_failed === 0 ? "✅" : "❌"}`);

  const allMatch =
    preSnapshot.total_authors === postSnapshot.total_authors &&
    postSnapshot.fk_validation.orphaned_titles === 0 &&
    postSnapshot.fk_validation.orphaned_contracts === 0 &&
    postSnapshot.fk_validation.orphaned_statements === 0 &&
    postSnapshot.encryption_validation.decryption_failed === 0;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  MIGRATION VALIDATION: ${allMatch ? "✅ SUCCESS" : "❌ FAILED"}`);
  console.log(`${"=".repeat(60)}\n`);

  if (!allMatch) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Validation failed:", error);
  process.exit(1);
});
