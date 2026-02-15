import type { Request, Response, NextFunction } from "express";
import * as dashboardService from "../services/dashboardService";

export async function getRequestCounts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Unauthenticated" } });
      return;
    }
    const range = (req.query.range as string) || "30d";
    const result = await dashboardService.getRequestCounts(userPayload, range);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getRecentRequests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Unauthenticated" } });
      return;
    }
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 10));
    const range = (req.query.range as string) || "30d";
    const result = await dashboardService.getRecentRequests(userPayload, limit, range);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getRecentTemplates(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Unauthenticated" } });
      return;
    }
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 10));
    const range = (req.query.range as string) || "30d";
    const result = await dashboardService.getRecentTemplates(userPayload, limit, range);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getKpis(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Unauthenticated" } });
      return;
    }
    const range = (req.query.range as string) || "30d";
    const result = await dashboardService.getKpis(userPayload, range);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
