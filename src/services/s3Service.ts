import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config/env";
import { AppError } from "../errors/AppError";

// Initialize S3 client
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

export interface S3FileMetadata {
  size: number;
  lastModified: Date;
  contentType?: string;
}

/**
 * Upload a file to S3
 * @param key S3 object key (path)
 * @param fileBuffer File buffer/content
 * @param contentType MIME type
 * @param metadata Optional metadata
 * @returns S3 object key
 */
export async function uploadFile(
  key: string,
  fileBuffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: metadata,
    });

    await s3Client.send(command);
    return key;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown S3 error";
    throw new AppError(
      500,
      "S3_UPLOAD_FAILED",
      `Failed to upload file to S3: ${errorMessage}`,
      error
    );
  }
}

/**
 * Generate a presigned URL for downloading/previewing a file
 * @param key S3 object key
 * @param expiresIn Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL
 */
export async function generatePresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown S3 error";
    throw new AppError(
      500,
      "S3_PRESIGNED_URL_FAILED",
      `Failed to generate presigned URL: ${errorMessage}`,
      error
    );
  }
}

/**
 * Delete a file from S3
 * @param key S3 object key
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown S3 error";
    throw new AppError(
      500,
      "S3_DELETE_FAILED",
      `Failed to delete file from S3: ${errorMessage}`,
      error
    );
  }
}

/**
 * Get file metadata from S3
 * @param key S3 object key
 * @returns File metadata
 */
export async function getFileMetadata(
  key: string
): Promise<S3FileMetadata> {
  try {
    const command = new HeadObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    return {
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      contentType: response.ContentType,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown S3 error";
    throw new AppError(
      404,
      "S3_FILE_NOT_FOUND",
      `File not found in S3: ${errorMessage}`,
      error
    );
  }
}

/**
 * Build S3 key for a template file
 * @param templateId Template ID
 * @param version Version number
 * @param fileName Original file name
 * @returns S3 key
 */
export function buildTemplateS3Key(
  templateId: string,
  version: number,
  fileName: string
): string {
  // Sanitize fileName to remove special characters that might cause issues
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const basePath = config.aws.s3BasePath
    ? `${config.aws.s3BasePath}/`
    : "";
  return `${basePath}templates/${templateId}/v${version}/${sanitizedFileName}`;
}
