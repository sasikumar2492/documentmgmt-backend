/**
 * Run from documentmgmt-backend folder:
 *   node scripts/verify-and-push-db.js
 *
 * This runs "prisma db push" so missing tables (e.g. PasswordResetToken) are created.
 * Uses the same .env DATABASE_URL as your running app.
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
console.log("Working directory:", root);
console.log("Running: npx prisma db push\n");

try {
  execSync("npx prisma db push", {
    cwd: root,
    stdio: "inherit",
    timeout: 60000,
  });
  console.log("\nDone. Restart your backend (npm run dev) and try the forgot-password API again.");
} catch (e) {
  console.error("\nFailed. Check:");
  console.error("  1. PostgreSQL is running and reachable");
  console.error("  2. .env DATABASE_URL is correct (same as when you start the backend)");
  console.error("  3. Your user has permission to create tables");
  process.exit(1);
}
