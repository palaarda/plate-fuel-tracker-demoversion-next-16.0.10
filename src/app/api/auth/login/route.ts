import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import {
  authCookieName,
  authCookieOptions,
  createSessionToken,
  ensureDefaultAdmin,
  verifyPassword,
} from "@/lib/auth";
import { UserModel } from "@/models/User";

export async function POST(request: Request) {
  await connectDb();
  await ensureDefaultAdmin();

  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json(
      { message: "Kullanıcı adı ve şifre gereklidir." },
      { status: 400 }
    );
  }

  const user = await UserModel.findOne({ username });
  if (!user) {
    return NextResponse.json({ message: "Kullanıcı bulunamadı." }, { status: 401 });
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ message: "Şifre hatalı." }, { status: 401 });
  }

  const token = createSessionToken(user);

  const response = NextResponse.json({
    user: { id: user._id, name: user.name, username: user.username, role: user.role },
  });

  response.cookies.set(authCookieName, token, authCookieOptions);

  return response;
}

