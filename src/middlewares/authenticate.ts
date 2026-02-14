import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type JwtPayload } from "../utils/jwt";
import { AppError } from "../errors/AppError";

declare module "express-serve-static-core" {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Request {
    user?: JwtPayload;
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHENTICATED", "Authentication token missing"));
  }

  const token = authHeader.substring("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(new AppError(401, "UNAUTHENTICATED", "Invalid or expired authentication token"));
  }
}

