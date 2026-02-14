import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config/env";

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  departmentIds: string[];
  orgId?: string | null;
  context?: "DMS" | "TicketFlow";
}

const accessSignOptions: SignOptions = {
  expiresIn: config.jwt.accessExpiresIn as SignOptions["expiresIn"],
};

const refreshSignOptions: SignOptions = {
  expiresIn: config.jwt.refreshExpiresIn as SignOptions["expiresIn"],
};

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, accessSignOptions);
}

export function signRefreshToken(payload: Pick<JwtPayload, "sub" | "context">): string {
  return jwt.sign(payload, config.jwt.refreshSecret, refreshSignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, "sub" | "context"> & {
  iat: number;
  exp: number;
} {
  return jwt.verify(token, config.jwt.refreshSecret) as Pick<
    JwtPayload,
    "sub" | "context"
  > & {
    iat: number;
    exp: number;
  };
}

