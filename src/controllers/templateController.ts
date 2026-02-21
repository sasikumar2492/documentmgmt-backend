import type { Request, Response, NextFunction } from "express";
import * as templateService from "../services/templateService";
import { AppError } from "../errors/AppError";

function getTemplateId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] ?? "" : id ?? "";
}

export async function uploadTemplate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      return next(new AppError(400, "FILE_REQUIRED", "File is required"));
    }

    const { name, description, departmentId, organizationId } = req.body;
    const userId = req.user?.sub;

    if (!userId) {
      return next(
        new AppError(401, "UNAUTHENTICATED", "User authentication required")
      );
    }

    const template = await templateService.createTemplate({
      file,
      name,
      description,
      departmentId: departmentId || undefined,
      organizationId: organizationId || undefined,
      createdById: userId,
    });

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
}

export async function getTemplates(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize
      ? Number(req.query.pageSize)
      : undefined;
    const departmentId = req.query.departmentId as string | undefined;
    const status = req.query.status as string | undefined;
    const organizationId = req.query.organizationId as string | undefined;
    const includeDeleted = req.query.includeDeleted === "true";

    const result = await templateService.getTemplates({
      page,
      pageSize,
      departmentId,
      status,
      organizationId,
      includeDeleted,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTemplate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = getTemplateId(req);
    const includeDownloadUrl = req.query.includeDownloadUrl === "true";
    const includeHtml = req.query.includeHtml === "true";

    const template = await templateService.getTemplateById(id, {
      includeDownloadUrl,
      includeHtml,
    });

    res.status(200).json(template);
  } catch (error) {
    next(error);
  }
}

export async function getTemplateHtml(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = getTemplateId(req);
    const html = await templateService.getTemplateHtml(id);
    res.status(200).set("Content-Type", "text/html; charset=utf-8").send(html);
  } catch (error) {
    next(error);
  }
}

export async function saveTemplateContent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = getTemplateId(req);
    const { html } = req.body;
    const userId = req.user?.sub;

    if (!userId) {
      return next(
        new AppError(401, "UNAUTHENTICATED", "User authentication required")
      );
    }
    if (typeof html !== "string" || !html.trim()) {
      return next(
        new AppError(400, "HTML_REQUIRED", "Request body must include non-empty 'html' string")
      );
    }

    const template = await templateService.saveTemplateContent(
      id,
      html.trim(),
      userId
    );

    res.status(200).json(template);
  } catch (error) {
    next(error);
  }
}

export async function getTemplateDownload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = getTemplateId(req);
    const expiresIn = req.query.expiresIn
      ? Number(req.query.expiresIn)
      : 3600;

    const result = await templateService.getTemplateDownloadUrl(id, expiresIn);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateTemplate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = getTemplateId(req);
    const { name, description, parsedSections, formSchema, aiWorkflowProposal, status } =
      req.body;
    const userId = req.user?.sub;

    const template = await templateService.updateTemplate(
      id,
      {
        name,
        description,
        parsedSections,
        formSchema,
        aiWorkflowProposal,
        status,
      },
      userId
    );

    res.status(200).json(template);
  } catch (error) {
    next(error);
  }
}

export async function approveTemplate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = getTemplateId(req);
    const userId = req.user?.sub;

    if (!userId) {
      return next(
        new AppError(401, "UNAUTHENTICATED", "User authentication required")
      );
    }

    const template = await templateService.approveTemplate(id, userId);

    res.status(200).json(template);
  } catch (error) {
    next(error);
  }
}

export async function getTemplateVersions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = getTemplateId(req);
    const includeDownloadUrls = req.query.includeDownloadUrls === "true";

    const versions = await templateService.getTemplateVersions(
      id,
      includeDownloadUrls
    );

    res.status(200).json({ versions });
  } catch (error) {
    next(error);
  }
}

export async function deleteTemplate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = getTemplateId(req);
    const deleteS3File = req.query.deleteS3File === "true";

    const result = await templateService.deleteTemplate(id, deleteS3File);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
