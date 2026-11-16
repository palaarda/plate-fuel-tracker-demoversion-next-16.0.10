import { NextResponse } from "next/server";
import {
  findVehicleByKey,
  getRouteKey,
  jsonError,
  requireAuth,
  withErrorHandling,
  type IdRouteContext,
} from "@/lib/api";
import { VehicleModel } from "@/models/Vehicle";
import { FuelEntryModel } from "@/models/FuelEntry";

export const GET = withErrorHandling(
  "vehicles:detail",
  async (_request: Request, ctx: IdRouteContext) => {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const key = await getRouteKey(ctx);
    if (!key) {
      return jsonError("Araç kimliği eksik veya geçersiz.", 400);
    }

    const vehicle = await findVehicleByKey(key);
    if (!vehicle) {
      return jsonError("Araç bulunamadı.", 404);
    }

    return NextResponse.json({ vehicle });
  }
);

export const DELETE = withErrorHandling(
  "vehicles:delete",
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

    await FuelEntryModel.deleteMany({ vehicleId: vehicle._id });
    await VehicleModel.deleteOne({ _id: vehicle._id });

    return NextResponse.json({ message: "Araç silindi." }, { status: 200 });
  }
);
