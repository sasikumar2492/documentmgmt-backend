import type { Request, Response, NextFunction } from "express";
import * as templateService from "../services/templateService";
import { AppError } from "../errors/AppError";

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
    const { id } = req.params;
    const includeDownloadUrl = req.query.includeDownloadUrl === "true";

    const template = await templateService.getTemplateById(
      id,
      includeDownloadUrl
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
    const { id } = req.params;
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
    const { id } = req.params;
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
    const { id } = req.params;
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
    const { id } = req.params;
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
    const { id } = req.params;
    const deleteS3File = req.query.deleteS3File === "true";

    const result = await templateService.deleteTemplate(id, deleteS3File);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
