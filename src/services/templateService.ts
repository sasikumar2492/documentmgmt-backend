import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../config/prisma";
import { AppError } from "../errors/AppError";
import {
  uploadFile,
  generatePresignedUrl,
  deleteFile,
  buildTemplateS3Key,
} from "./s3Service";
import { config } from "../config/env";
import { docToPdf, htmlToDocxWithFallback } from "./convertApiService";
import { mergeHtmlDocxIntoOriginal } from "./docxMergeService";
import { pdfToHtml } from "./geminiService";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/pdf", // .pdf
  "application/msword", // .doc (legacy)
  "application/vnd.ms-excel", // .xls (legacy)
];

const WORD_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "templates");

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
 * Create a new template.
 * - For .doc/.docx: store locally → ConvertAPI to PDF → Gemini to HTML; no S3 until save-content.
 * - For .xlsx/.pdf etc.: upload to S3 and store reference (existing behavior).
 */
export async function createTemplate(input: CreateTemplateInput) {
  validateFile(input.file);

  const templateId = randomUUID();
  const version = 1;
  const isWord =
    WORD_MIME_TYPES.includes(input.file.mimetype) ||
    /\.(doc|docx)$/i.test(input.file.originalname);

  if (isWord) {
    // Step 2: Store locally
    const ext = input.file.originalname.toLowerCase().endsWith(".docx")
      ? "docx"
      : "doc";
    const dir = path.join(UPLOADS_DIR, templateId);
    fs.mkdirSync(dir, { recursive: true });
    const localFilePath = path.join(dir, `original.${ext}`);
    fs.writeFileSync(localFilePath, input.file.buffer);

    // Create DB record (no S3 yet). Schema: s3Bucket/s3Key optional, localFilePath, htmlContent.
    const template = await prisma.documentTemplate.create({
      data: {
        id: templateId,
        s3Bucket: null,
        s3Key: null,
        localFilePath,
        htmlContent: null,
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
      } as any,
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

    // Step 3 & 4: ConvertAPI doc→PDF, then Gemini PDF→HTML
    let htmlContent: string | null = null;
    try {
      const pdfBuffer = await docToPdf(input.file.buffer, ext);
      htmlContent = await pdfToHtml(pdfBuffer);
    } catch (err) {
      console.error("Conversion pipeline failed:", err);
      await prisma.documentTemplate.update({
        where: { id: templateId },
        data: { htmlContent: null },
      });
      throw err;
    }

    await prisma.documentTemplate.update({
      where: { id: templateId },
      data: { htmlContent } as { htmlContent: string },
    });

    const t = template as typeof template & { department?: { id: string; name: string; code: string } | null; organization?: { id: string; name: string; code: string } | null };
    return {
      id: template.id,
      name: template.name,
      originalFileName: template.originalFileName,
      fileSize: Number(template.fileSize),
      mimeType: template.mimeType,
      version: template.version,
      status: template.status,
      department: t.department
        ? { id: t.department.id, name: t.department.name, code: t.department.code }
        : null,
      organization: t.organization
        ? { id: t.organization.id, name: t.organization.name, code: t.organization.code }
        : null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      html: htmlContent,
    };
  }

  // Non-Word: upload to S3 (existing behavior)
  const s3Key = buildTemplateS3Key(
    templateId,
    version,
    input.file.originalname
  );
  await uploadFile(
    s3Key,
    input.file.buffer,
    input.file.mimetype,
    {
      originalFileName: input.file.originalname,
      createdById: input.createdById,
    }
  );

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
 * Get a single template by ID.
 * @param includeHtml When true, include htmlContent in response (for editable HTML view).
 * @param includeDownloadUrl When true, include presigned URL if template has S3 file (after save-content).
 */
export async function getTemplateById(
  id: string,
  options: { includeDownloadUrl?: boolean; includeHtml?: boolean } = {}
) {
  const { includeDownloadUrl = false, includeHtml = false } = options;
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

  const result: Record<string, unknown> = {
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

  const htmlContent = (template as Record<string, unknown>).htmlContent;
  if (includeHtml && htmlContent != null) {
    result.html = htmlContent as string;
  }

  if (includeDownloadUrl && template.s3Key) {
    const downloadUrl = await generatePresignedUrl(template.s3Key, 3600);
    result.downloadUrl = downloadUrl;
    result.downloadUrlExpiresAt = new Date(
      Date.now() + 3600 * 1000
    ).toISOString();
  }

  return result;
}

/**
 * Get template HTML only (for editable view). Returns 404 if no HTML.
 */
export async function getTemplateHtml(id: string): Promise<string> {
  const template = await prisma.documentTemplate.findUnique({
    where: { id, deletedAt: null },
  });
  const htmlContent = template && (template as Record<string, unknown>).htmlContent;
  if (htmlContent == null || typeof htmlContent !== "string") {
    throw new AppError(
      404,
      "TEMPLATE_HTML_NOT_FOUND",
      "Template not found or HTML not yet generated (upload a .doc/.docx first)."
    );
  }
  return htmlContent;
}

/**
 * Generate presigned URL for template download/preview.
 * Fails if template has no S3 file yet (user must save edited HTML first).
 */
export async function getTemplateDownloadUrl(id: string, expiresIn: number = 3600) {
  const template = await prisma.documentTemplate.findUnique({
    where: { id, deletedAt: null },
    select: { s3Key: true },
  });

  if (!template) {
    throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template not found");
  }

  if (!template.s3Key) {
    throw new AppError(
      400,
      "DOCUMENT_NOT_SAVED",
      "Document file is not available yet. Save the edited HTML content first (POST /templates/:id/save-content) to generate the .docx and upload to storage."
    );
  }

  const downloadUrl = await generatePresignedUrl(template.s3Key, expiresIn);
  return {
    downloadUrl,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

/**
 * Save edited HTML: reconvert to .docx and upload to S3 (Step 7 & 8).
 */
export async function saveTemplateContent(
  id: string,
  html: string,
  updatedById: string
) {
  const template = await prisma.documentTemplate.findUnique({
    where: { id, deletedAt: null },
    include: {
      department: true,
      organization: true,
    },
  });

  if (!template) {
    throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template not found");
  }

  const version = template.version;
  const baseName = template.originalFileName.replace(/\.[^.]+$/, "") || "document";
  const docxFileName = `${baseName}.docx`;
  const s3Key = buildTemplateS3Key(id, version, docxFileName);

  let docxBuffer: Buffer;

  const localPath = template.localFilePath as string | null;
  const isDocx =
    localPath != null &&
    (localPath.toLowerCase().endsWith(".docx") ||
      (template.mimeType &&
        String(template.mimeType).includes(
          "openxmlformats-officedocument.wordprocessingml"
        )));

  if (isDocx && localPath && fs.existsSync(localPath)) {
    // Retrieve original document from local storage and merge updated HTML into it
    const originalBuffer = fs.readFileSync(localPath);
    const newDocxFromHtml = await htmlToDocxWithFallback(html);
    docxBuffer = await mergeHtmlDocxIntoOriginal(originalBuffer, newDocxFromHtml);
  } else {
    // No original .docx on disk (e.g. .doc only, or missing file): convert HTML to DOCX only
    docxBuffer = await htmlToDocxWithFallback(html);
  }

  await uploadFile(
    s3Key,
    docxBuffer,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    { updatedById }
  );

  const updated = await prisma.documentTemplate.update({
    where: { id },
    data: {
      s3Bucket: config.aws.s3Bucket,
      s3Key,
      htmlContent: html,
      updatedById,
      updatedAt: new Date(),
    } as any,
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

  const u = updated as typeof updated & { department?: { id: string; name: string; code: string } | null; organization?: { id: string; name: string; code: string } | null };
  return {
    status: "success" as const,
    s3Key: updated.s3Key ?? undefined,
    updatedAt: updated.updatedAt.toISOString(),
    id: updated.id,
    name: updated.name,
    originalFileName: updated.originalFileName,
    fileSize: Number(updated.fileSize),
    mimeType: updated.mimeType,
    version: updated.version,
    templateStatus: updated.status,
    department: u.department
      ? { id: u.department.id, name: u.department.name, code: u.department.code }
      : null,
    organization: u.organization
      ? { id: u.organization.id, name: u.organization.name, code: u.organization.code }
      : null,
    createdAt: updated.createdAt,
    html: updated.htmlContent,
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
      ...(input as Record<string, unknown>),
      updatedById,
      updatedAt: new Date(),
    } as any,
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
        const base = result.find((r) => r.id === v.id);
        if (!v.s3Key) {
          return { ...base, downloadUrl: null, downloadUrlExpiresAt: null };
        }
        const downloadUrl = await generatePresignedUrl(v.s3Key, 3600);
        return {
          ...base,
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

  // Optionally delete S3 file (only if template has one)
  if (deleteS3File && template.s3Key) {
    try {
      await deleteFile(template.s3Key);
    } catch (error) {
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
