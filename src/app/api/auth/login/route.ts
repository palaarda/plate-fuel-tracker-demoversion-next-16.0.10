import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { connectDb } from "@/lib/db";
import {
  authCookieName,
  authCookieOptions,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { jsonError, readJsonBody, withErrorHandling } from "@/lib/api";
import {
  createBackoffLimiter,
  createConcurrencyLimiter,
  createRateLimiter,
  getClientIp,
} from "@/lib/rate-limit";
import { validateCredentials } from "@/lib/validation";
import { UserModel } from "@/models/User";

const WINDOW_MS = 15 * 60 * 1000;
const ipLimiter = createRateLimiter({ limit: 30, windowMs: WINDOW_MS });

const accountBackoff = createBackoffLimiter({
  freeAttempts: 5,
  baseDelayMs: 15 * 1000,
  maxDelayMs: 5 * 60 * 1000,
  resetAfterMs: WINDOW_MS,
});

const GLOBAL_BUDGET_KEY = "global";
const bcryptBudget = createRateLimiter({ limit: 60, windowMs: 60 * 1000 });
const bcryptSlots = createConcurrencyLimiter({ maxConcurrent: 2, maxQueued: 8 });

const serverBusy = (retryAfterSeconds: number) =>
  jsonError("Sunucu şu anda yoğun. Lütfen birkaç saniye sonra tekrar deneyin.", 503, {
    "Retry-After": String(retryAfterSeconds),
  });

let dummyHashPromise: Promise<string> | null = null;
const getDummyHash = () =>
  (dummyHashPromise ??= bcrypt.hash(randomBytes(16).toString("hex"), 12));

const INVALID_CREDENTIALS = "Kullanıcı adı veya şifre hatalı.";

export const POST = withErrorHandling("auth:login", async (request: Request) => {
  const parsed = validateCredentials(await readJsonBody(request));
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }
  const { username, password } = parsed.value;

  const ip = getClientIp(request);
  const normalizedUsername = username.toLowerCase();
  const accountKey = ip ? `${ip}:${normalizedUsername}` : `account:${normalizedUsername}`;
  const retryAfter = Math.max(
    ip ? ipLimiter.retryAfter(ip) : 0,
    accountBackoff.retryAfter(accountKey)
  );
  if (retryAfter > 0) {
    return jsonError("Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  const budgetRetryAfter = bcryptBudget.retryAfter(GLOBAL_BUDGET_KEY);
  if (budgetRetryAfter > 0) {
    return serverBusy(budgetRetryAfter);
  }
  if (ip) ipLimiter.hit(ip);
  bcryptBudget.hit(GLOBAL_BUDGET_KEY);

  await connectDb();
  const user = await UserModel.findOne({ username }).select("+passwordHash username name role");
  const verification = await bcryptSlots.tryRun(async () =>
    verifyPassword(password, user?.passwordHash ?? (await getDummyHash()))
  );
  if (!verification.ok) {
    return serverBusy(1);
  }

  if (!user || !verification.value) {
    accountBackoff.fail(accountKey);
    return jsonError(INVALID_CREDENTIALS, 401);
  }

  accountBackoff.reset(accountKey);
  const token = createSessionToken(user);

  const response = NextResponse.json({
    user: { id: user._id, name: user.name, username: user.username, role: user.role },
  });
  response.cookies.set(authCookieName, token, authCookieOptions);

  return response;
});
