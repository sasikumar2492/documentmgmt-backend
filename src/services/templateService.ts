import { randomUUID } from "crypto";
import { prisma } from "../config/prisma";
import { AppError } from "../errors/AppError";
import {
  uploadFile,
  generatePresignedUrl,
  deleteFile,
  buildTemplateS3Key,
} from "./s3Service";
import { config } from "../config/env";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/pdf", // .pdf
  "application/msword", // .doc (legacy)
  "application/vnd.ms-excel", // .xls (legacy)
];

export interface CreateTemplateInput {
  file: Express.Multer.File;
  name?: string;
  description?: string;
  departmentId?: string;
  organizationId?: string;
  createdById: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  parsedSections?: unknown;
  formSchema?: unknown;
  aiWorkflowProposal?: unknown;
  status?: "draft" | "pending_approval" | "approved" | "deprecated";
}

/**
 * Validate uploaded file
 */
function validateFile(file: Express.Multer.File): void {
  if (!file) {
    throw new AppError(400, "FILE_REQUIRED", "File is required");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(
      400,
      "FILE_TOO_LARGE",
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError(
      400,
      "INVALID_FILE_TYPE",
      `File type not allowed. Allowed types: Word (.docx), Excel (.xlsx), PDF (.pdf)`
    );
  }
}

/**
 * Create a new template with file upload to S3
 */
export async function createTemplate(input: CreateTemplateInput) {
  validateFile(input.file);

  // Build S3 key
  const templateId = randomUUID();
  const version = 1;
  const s3Key = buildTemplateS3Key(
    templateId,
    version,
    input.file.originalname
  );

  // Upload file to S3
  await uploadFile(
    s3Key,
    input.file.buffer,
    input.file.mimetype,
    {
      originalFileName: input.file.originalname,
      createdById: input.createdById,
    }
  );

  // Create template record in database
  const template = await prisma.documentTemplate.create({
    data: {
      id: templateId,
      s3Bucket: config.aws.s3Bucket,
      s3Key,
      originalFileName: input.file.originalname,
      fileSize: BigInt(input.file.size),
      mimeType: input.file.mimetype,
      name: input.name || input.file.originalname,
      description: input.description,
      version,
      status: "draft",
      departmentId: input.departmentId,
      organizationId: input.organizationId,
      createdById: input.createdById,
    },
    include: {
      department: true,
      organization: true,
      createdBy: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  });

  return {
    id: template.id,
    name: template.name,
    originalFileName: template.originalFileName,
    fileSize: Number(template.fileSize),
    mimeType: template.mimeType,
    version: template.version,
    status: template.status,
    department: template.department
      ? {
          id: template.department.id,
          name: template.department.name,
          code: template.department.code,
        }
      : null,
    organization: template.organization
      ? {
          id: template.organization.id,
          name: template.organization.name,
          code: template.organization.code,
        }
      : null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

/**
 * Get templates with pagination and filters
 */
export async function getTemplates(params: {
  page?: number;
  pageSize?: number;
  departmentId?: string;
  status?: string;
  organizationId?: string;
  includeDeleted?: boolean;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 10, 100); // Max 100 per page
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params.departmentId) {
    where.departmentId = params.departmentId;
  }
  if (params.status) {
    where.status = params.status;
  }
  if (params.organizationId) {
    where.organizationId = params.organizationId;
  }
  if (!params.includeDeleted) {
    where.deletedAt = null;
  }

  const [templates, total] = await Promise.all([
    prisma.documentTemplate.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    }),
    prisma.documentTemplate.count({ where }),
  ]);

  return {
    items: templates.map((t) => ({
      id: t.id,
      name: t.name,
      originalFileName: t.originalFileName,
      fileSize: Number(t.fileSize),
      mimeType: t.mimeType,
      version: t.version,
      status: t.status,
      department: t.department,
      organization: t.organization,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(
  id: string,
  includeDownloadUrl: boolean = false
) {
  const template = await prisma.documentTemplate.findUnique({
    where: { id, deletedAt: null },
    include: {
      department: true,
      organization: true,
      createdBy: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  });

  if (!template) {
    throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template not found");
  }

  const result: any = {
    id: template.id,
    name: template.name,
    description: template.description,
    originalFileName: template.originalFileName,
    fileSize: Number(template.fileSize),
    mimeType: template.mimeType,
    version: template.version,
    status: template.status,
    parsedSections: template.parsedSections,
    formSchema: template.formSchema,
    aiWorkflowProposal: template.aiWorkflowProposal,
    department: template.department
      ? {
          id: template.department.id,
          name: template.department.name,
          code: template.department.code,
        }
      : null,
    organization: template.organization
      ? {
          id: template.organization.id,
          name: template.organization.name,
          code: template.organization.code,
        }
      : null,
    createdBy: template.createdBy,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };

  if (includeDownloadUrl) {
    const downloadUrl = await generatePresignedUrl(template.s3Key, 3600);
    result.downloadUrl = downloadUrl;
    result.downloadUrlExpiresAt = new Date(
      Date.now() + 3600 * 1000
    ).toISOString();
  }

  return result;
}

/**
 * Generate presigned URL for template download/preview
 */
export async function getTemplateDownloadUrl(id: string, expiresIn: number = 3600) {
  const template = await prisma.documentTemplate.findUnique({
    where: { id, deletedAt: null },
    select: { s3Key: true },
  });

  if (!template) {
    throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template not found");
  }

  const downloadUrl = await generatePresignedUrl(template.s3Key, expiresIn);
  return {
    downloadUrl,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

/**
 * Update template metadata
 */
export async function updateTemplate(
  id: string,
  input: UpdateTemplateInput,
  updatedById?: string
) {
  const template = await prisma.documentTemplate.findUnique({
    where: { id, deletedAt: null },
  });

  if (!template) {
    throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template not found");
  }

  const updated = await prisma.documentTemplate.update({
    where: { id },
    data: {
      ...input,
      updatedById,
      updatedAt: new Date(),
    },
    include: {
      department: true,
      organization: true,
      createdBy: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    version: updated.version,
    status: updated.status,
    parsedSections: updated.parsedSections,
    formSchema: updated.formSchema,
    aiWorkflowProposal: updated.aiWorkflowProposal,
    department: updated.department,
    organization: updated.organization,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Approve a template
 */
export async function approveTemplate(id: string, approvedById: string) {
  const template = await prisma.documentTemplate.findUnique({
    where: { id, deletedAt: null },
  });

  if (!template) {
    throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template not found");
  }

  if (template.status === "approved") {
    throw new AppError(
      400,
      "TEMPLATE_ALREADY_APPROVED",
      "Template is already approved"
    );
  }

  const updated = await prisma.documentTemplate.update({
    where: { id },
    data: {
      status: "approved",
      updatedById: approvedById,
      updatedAt: new Date(),
    },
    include: {
      department: true,
      organization: true,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    status: updated.status,
    version: updated.version,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Get all versions of a template
 */
export async function getTemplateVersions(id: string, includeDownloadUrls: boolean = false) {
  // First, get the base template to find related versions
  // For now, we'll return versions by matching originalFileName or name
  // In a full implementation, you might have a parentTemplateId field
  const template = await prisma.documentTemplate.findUnique({
    where: { id, deletedAt: null },
    select: { originalFileName: true, name: true },
  });

  if (!template) {
    throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template not found");
  }

  // Find all versions (by matching name or originalFileName)
  const versions = await prisma.documentTemplate.findMany({
    where: {
      OR: [
        { originalFileName: template.originalFileName },
        { name: template.name },
      ],
      deletedAt: null,
    },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      fileSize: true,
      createdAt: true,
      s3Key: true,
    },
  });

  const result = versions.map((v) => ({
    id: v.id,
    version: v.version,
    status: v.status,
    fileSize: Number(v.fileSize),
    createdAt: v.createdAt,
  }));

  if (includeDownloadUrls) {
    const versionsWithUrls = await Promise.all(
      versions.map(async (v) => {
        const downloadUrl = await generatePresignedUrl(v.s3Key, 3600);
        return {
          ...result.find((r) => r.id === v.id),
          downloadUrl,
          downloadUrlExpiresAt: new Date(
            Date.now() + 3600 * 1000
          ).toISOString(),
        };
      })
    );
    return versionsWithUrls;
  }

  return result;
}

/**
 * Soft delete a template
 */
export async function deleteTemplate(id: string, deleteS3File: boolean = false) {
  const template = await prisma.documentTemplate.findUnique({
    where: { id, deletedAt: null },
  });

  if (!template) {
    throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template not found");
  }

  // Optionally delete S3 file
  if (deleteS3File) {
    try {
      await deleteFile(template.s3Key);
    } catch (error) {
      // Log error but continue with soft delete
      console.error("Failed to delete S3 file:", error);
    }
  }

  // Soft delete in database
  await prisma.documentTemplate.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  return { message: "Template deleted successfully" };
}
