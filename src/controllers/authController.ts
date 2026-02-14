import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService";

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, context } = req.body as {
      email: string;
      password: string;
      context?: "DMS" | "TicketFlow";
    };

    const result = await authService.login({ email, password, context });

    res.status(200).json({
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };

    const tokens = await authService.refresh(refreshToken);

    res.status(200).json({ tokens });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    await authService.requestPasswordReset(email);
    res.status(200).json({ message: "If the email exists, a reset link has been sent." });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    await authService.resetPassword(token, newPassword);
    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    next(error);
  }
}

