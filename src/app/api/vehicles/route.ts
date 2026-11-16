import { NextResponse } from "next/server";
import {
  isDuplicateKeyError,
  jsonError,
  readJsonBody,
  requireAuth,
  withErrorHandling,
} from "@/lib/api";
import { isPlainObject, validateVehicleInput } from "@/lib/validation";
import { VehicleModel } from "@/models/Vehicle";

export const GET = withErrorHandling("vehicles:list", async () => {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const vehicles = await VehicleModel.find()
    .select("plate makeModel odometer driverName createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ vehicles });
});

export const POST = withErrorHandling("vehicles:create", async (request: Request) => {
  const auth = await requireAuth({ admin: true });
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (!isPlainObject(body)) {
    return jsonError("Geçersiz istek gövdesi.", 400);
  }

  const { plate, makeModel, odometer, driverName } = body;
  if (!plate || !makeModel || odometer === undefined || odometer === "" || !driverName) {
    return jsonError("Plaka, marka/model, kilometre ve sürücü zorunludur.", 400);
  }

  const parsed = validateVehicleInput({ plate, makeModel, odometer, driverName });
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  try {
    const vehicle = await VehicleModel.create(parsed.value);
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return jsonError("Bu plaka zaten kayıtlı.", 409);
    }
    throw error;
  }
});
