import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getJwtSecret, isProduction } from "./env";
import { isUserRole, type UserRole } from "./roles";
import type { UserDocument } from "../models/User";

export type SessionPayload = {
  sub: string;
  username: string;
  name: string;
  role: UserRole;
};

export type VerifiedSession = SessionPayload & { iat: number };

const MAX_IAT_CLOCK_SKEW_SECONDS = 60;
const JWT_ALGORITHM = "HS256";
const JWT_ISSUER = "hmf-panel";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const BCRYPT_ROUNDS = 12;

export const authCookieName = "auth_token";

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProduction,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export const hashPassword = async (password: string) =>
  bcrypt.hash(password, BCRYPT_ROUNDS);

export const verifyPassword = (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);

export const createSessionToken = (user: UserDocument) => {
  const payload: SessionPayload = {
    sub: user._id.toString(),
    username: user.username,
    name: user.name,
    role: isUserRole(user.role) ? user.role : "user",
  };

  return jwt.sign(payload, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    expiresIn: SESSION_TTL_SECONDS,
  });
};

const isValidIat = (iat: unknown): iat is number =>
  typeof iat === "number" &&
  Number.isInteger(iat) &&
  iat > 0 &&
  iat <= Math.floor(Date.now() / 1000) + MAX_IAT_CLOCK_SKEW_SECONDS;

const isVerifiedSession = (value: unknown): value is VerifiedSession => {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sub === "string" &&
    typeof v.username === "string" &&
    typeof v.name === "string" &&
    isUserRole(v.role) &&
    isValidIat(v.iat)
  );
};

export const verifySessionToken = (token: string): VerifiedSession | null => {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
    });
    return isVerifiedSession(decoded) ? decoded : null;
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      return null;
    }
    throw err;
  }
};

export const getSessionFromCookies = async (): Promise<VerifiedSession | null> => {
  const jar = await cookies();
  const token = jar.get(authCookieName)?.value;
  if (!token) return null;
  return verifySessionToken(token);
};
