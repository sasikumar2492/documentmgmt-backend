/**
 * Test AWS S3 connection and bucket access
 * Run: npx ts-node scripts/test-s3-connection.ts
 */
import "dotenv/config";
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from "@aws-sdk/client-s3";
import { config } from "../src/config/env";

async function testS3Connection() {
  console.log("=".repeat(60));
  console.log("AWS S3 Connection Test");
  console.log("=".repeat(60));
  console.log("\nConfiguration:");
  console.log(`  Region: ${config.aws.region}`);
  console.log(`  Bucket: ${config.aws.s3Bucket}`);
  console.log(`  Base Path: ${config.aws.s3BasePath}`);
  console.log(`  Access Key ID: ${config.aws.accessKeyId.substring(0, 10)}...`);
  console.log(`  Secret Access Key: ${config.aws.secretAccessKey ? "***configured***" : "NOT SET"}`);
  console.log("\n" + "-".repeat(60));

  const s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });

  try {
    // Test 1: Check bucket exists and is accessible
    console.log("\n[Test 1] Checking bucket access...");
    const headBucketCommand = new HeadBucketCommand({
      Bucket: config.aws.s3Bucket,
    });
    await s3Client.send(headBucketCommand);
    console.log("✅ Bucket is accessible");

    // Test 2: List objects in bucket (with prefix if base path exists)
    console.log("\n[Test 2] Listing objects in bucket...");
    const prefix = config.aws.s3BasePath ? `${config.aws.s3BasePath}/` : "";
    const listCommand = new ListObjectsV2Command({
      Bucket: config.aws.s3Bucket,
      Prefix: prefix,
      MaxKeys: 10,
    });
    const listResponse = await s3Client.send(listCommand);
    
    console.log(`✅ Found ${listResponse.KeyCount || 0} objects`);
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log("\nSample objects:");
      listResponse.Contents.slice(0, 5).forEach((obj, idx) => {
        console.log(`  ${idx + 1}. ${obj.Key} (${(obj.Size || 0) / 1024} KB)`);
      });
    } else {
      console.log("  (Bucket is empty or no objects match the prefix)");
    }

    // Test 3: Test S3 service functions
    console.log("\n[Test 3] Testing S3 service functions...");
    const { buildTemplateS3Key } = await import("../src/services/s3Service");
    const testKey = buildTemplateS3Key(
      "test-template-id",
      1,
      "test-file.xlsx"
    );
    console.log(`✅ Generated S3 key: ${testKey}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ All S3 tests passed!");
    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ S3 Test Failed");
    console.error("=".repeat(60));
    console.error("\nError Details:");
    console.error(`  Code: ${error.Code || error.name || "Unknown"}`);
    console.error(`  Message: ${error.message || "Unknown error"}`);
    if (error.$metadata) {
      console.error(`  HTTP Status: ${error.$metadata.httpStatusCode}`);
      console.error(`  Request ID: ${error.$metadata.requestId}`);
    }
    console.error("\nTroubleshooting:");
    console.error("  1. Verify AWS credentials are correct");
    console.error("  2. Check bucket name and region");
    console.error("  3. Ensure IAM user has s3:ListBucket and s3:GetObject permissions");
    console.error("  4. Verify bucket exists in the specified region");
    process.exit(1);
  }
}

void testS3Connection();
