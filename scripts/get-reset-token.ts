/**
 * Generate a password reset token for testing the reset-password API.
 * Run: npx ts-node scripts/get-reset-token.ts [email]
 * Example: npx ts-node scripts/get-reset-token.ts sarah.admin@company.com
 *
 * Then use the printed token in Postman:
 *   POST /api/auth/reset-password
 *   Body: { "token": "<paste token here>", "newPassword": "YourNewPass123" }
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

const prisma = new PrismaClient();

const email = process.argv[2] || "sarah.admin@company.com";

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error("User not found:", email);
    console.error("Run 'npm run seed' first to create demo users.");
    process.exit(1);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  console.log("\nUse this token in Postman for POST /api/auth/reset-password:\n");
  console.log(rawToken);
  console.log("\nBody: { \"token\": \"<token above>\", \"newPassword\": \"YourNewPass123\" }\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
