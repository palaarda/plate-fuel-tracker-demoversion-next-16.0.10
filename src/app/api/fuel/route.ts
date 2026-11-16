import { NextResponse } from "next/server";
import { jsonError, requireAuth, withErrorHandling } from "@/lib/api";
import { VEHICLE_LIMITS } from "@/lib/validation";
import { FuelEntryModel } from "@/models/FuelEntry";

export const GET = withErrorHandling("fuel:list", async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const plate = searchParams.get("plate")?.trim().toUpperCase();
  if (plate && plate.length > VEHICLE_LIMITS.plateMaxLength * 2) {
    return jsonError("Geçersiz plaka.", 400);
  }

  const query = plate ? { plate } : {};
  const entries = await FuelEntryModel.find(query)
    .select("vehicleId plate liters amount createdAt")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({ entries });
});
