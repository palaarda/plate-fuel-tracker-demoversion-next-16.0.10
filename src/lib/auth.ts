import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDb } from "./db";
import { UserModel, type UserDocument } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable eksik.");
}

export type SessionPayload = {
  sub: string;
  username: string;
  name: string;
  role?: string;
};

export const authCookieName = "auth_token";

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 gün
};

export const hashPassword = async (password: string) =>
  bcrypt.hash(password, 10);

export const verifyPassword = (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);

export const createSessionToken = (user: UserDocument) => {
  const payload: SessionPayload = {
    sub: user._id.toString(),
    username: user.username,
    name: user.name,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

export const verifySessionToken = (token: string): SessionPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch (err) {
    console.error("JWT doğrulama hatası:", err);
    return null;
  }
};

export const getSessionFromCookies = async (): Promise<SessionPayload | null> => {
  const jar = await cookies();
  const token = typeof jar.get === "function" ? jar.get(authCookieName)?.value : null;
  if (!token) return null;
  return verifySessionToken(token);
};

export const ensureDefaultAdmin = async () => {
  await connectDb();
  const count = await UserModel.countDocuments();
  if (count > 0) return;

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin1234";
  const name = process.env.ADMIN_NAME || "Demo Admin";

  const passwordHash = await hashPassword(password);
  await UserModel.create({
    username,
    name,
    passwordHash,
    role: "super_admin",
  });
};

