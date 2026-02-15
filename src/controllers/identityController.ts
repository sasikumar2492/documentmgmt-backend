import type { Request, Response, NextFunction } from "express";
import * as identityService from "../services/identityService";

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Unauthenticated" } });
      return;
    }

    const me = await identityService.getCurrentUser(userPayload);
    res.status(200).json(me);
  } catch (error) {
    next(error);
  }
}

export async function getRoles(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const roles = await identityService.listRoles();
    res.status(200).json(roles);
  } catch (error) {
    next(error);
  }
}

export async function getDepartments(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const departments = await identityService.listDepartments();
    res.status(200).json(departments);
  } catch (error) {
    next(error);
  }
}

export async function getNavigation(
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
    const navigation = await identityService.getNavigation(userPayload);
    res.status(200).json(navigation);
  } catch (error) {
    next(error);
  }
}

