import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { FuelEntryModel } from "@/models/FuelEntry";

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: "Yetkisiz" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const plate = searchParams.get("plate")?.trim().toUpperCase();

  await connectDb();

  const query = plate ? { plate } : {};
  const entries = await FuelEntryModel.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({ entries });
}

