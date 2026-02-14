#!/usr/bin/env node
/**
 * Applies pending Prisma migrations. Run from project root:
 *   node scripts/run-migrate.js
 * or: npm run db:migrate
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
try {
  execSync("npx prisma migrate deploy", {
    cwd: root,
    stdio: "inherit",
    timeout: 60000,
  });
} catch (e) {
  process.exit(e.status ?? 1);
}
