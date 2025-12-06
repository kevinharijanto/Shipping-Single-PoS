#!/usr/bin/env tsx
/**
 * Reset Database Script
 * Uses prisma db push --force-reset to drop and recreate all tables.
 * 
 * Usage: npx tsx src/scripts/resetDatabase.ts
 * 
 * NOTE: Make sure to stop any running processes that use the database
 *       (dev server, prisma studio) before running this script.
 */
import "dotenv/config";
import { execSync } from "node:child_process";

async function main() {
    console.log("🗑️  Resetting database...\n");
    console.log("⚠️  Make sure dev server and Prisma Studio are stopped!\n");

    // Run prisma db push with force-reset (drops all data)
    console.log("📦  Running prisma db push --force-reset...\n");
    execSync("npx prisma db push --force-reset --accept-data-loss", {
        stdio: "inherit",
        cwd: process.cwd(),
    });

    // Generate Prisma client
    console.log("\n🔧  Generating Prisma client...\n");
    execSync("npx prisma generate", {
        stdio: "inherit",
        cwd: process.cwd(),
    });

    console.log("\n✅  Database reset complete!");
    console.log("   You can now run a full sync to repopulate data.\n");
}

main().catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
});
