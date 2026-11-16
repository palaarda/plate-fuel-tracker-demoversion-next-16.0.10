import { NextResponse } from "next/server";
import {
  findVehicleByKey,
  getRouteKey,
  jsonError,
  readJsonBody,
  requireAuth,
  withErrorHandling,
  type IdRouteContext,
} from "@/lib/api";
import { validateFuelInput } from "@/lib/validation";
import { FuelEntryModel } from "@/models/FuelEntry";

export const POST = withErrorHandling(
  "fuel:create",
  async (request: Request, ctx: IdRouteContext) => {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const parsed = validateFuelInput(await readJsonBody(request));
    if (!parsed.ok) {
      return jsonError(parsed.message, 400);
    }

    const key = await getRouteKey(ctx);
    if (!key) {
      return jsonError("Araç kimliği eksik veya geçersiz.", 400);
    }

    const vehicle = await findVehicleByKey(key);
    if (!vehicle) {
      return jsonError("Araç bulunamadı.", 404);
    }

    const entry = await FuelEntryModel.create({
      vehicleId: vehicle._id,
      plate: vehicle.plate,
      liters: parsed.value.liters,
      amount: parsed.value.amount,
    });

    return NextResponse.json({ entry }, { status: 201 });
  }
);

export const DELETE = withErrorHandling(
  "fuel:delete",
  async (_request: Request, ctx: IdRouteContext) => {
    const auth = await requireAuth({ admin: true });
    if (!auth.ok) return auth.response;

    const key = await getRouteKey(ctx);
    if (!key) {
      return jsonError("Araç kimliği eksik veya geçersiz.", 400);
    }

    const vehicle = await findVehicleByKey(key);
    if (!vehicle) {
      return jsonError("Araç bulunamadı.", 404);
    }

    const result = await FuelEntryModel.deleteMany({ vehicleId: vehicle._id });

    return NextResponse.json(
      {
        message: "Yakıt kayıtları silindi.",
        deleted: result.deletedCount ?? 0,
      },
      { status: 200 }
    );
  }
);
