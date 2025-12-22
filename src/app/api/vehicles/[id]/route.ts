import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { VehicleModel } from "@/models/Vehicle";
import { FuelEntryModel } from "@/models/FuelEntry";
import mongoose from "mongoose";

type Params =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Params) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ message: "Yetkisiz" }, { status: 401 });
    }

    const conn = await connectDb();

    const resolvedParams =
      typeof (ctx as any).params?.then === "function"
        ? await (ctx as any).params
        : (ctx as any).params;

    const id = resolvedParams?.id?.trim();
    if (!id) {
      return NextResponse.json({ message: "Araç kimliği eksik." }, { status: 400 });
    }

    let vehicle = null;

    // Önce ObjectId ise dene
    if (mongoose.Types.ObjectId.isValid(id)) {
      vehicle = await VehicleModel.findById(id).lean();
    }

    // Bulunamazsa plaka ile dene
    if (!vehicle) {
      vehicle = await VehicleModel.findOne({ plate: id.toUpperCase() }).lean();
    }

    if (!vehicle) {
      const total = await VehicleModel.countDocuments();
      const sample = await VehicleModel.find()
        .limit(5)
        .select("_id plate")
        .lean();
      console.warn(
        `[vehicle-detail] bulunamadı db=${conn?.name} id=${id} total=${total} örnek=${JSON.stringify(
          sample
        )}`
      );
      return NextResponse.json(
        {
          message: "Araç bulunamadı.",
          debug: {
            db: conn?.name,
            requestedId: id,
            total,
            sample,
          },
        },
        { status: 404 }
      );
    }

    console.log("[vehicle-detail] bulundu", conn?.name, "id=", id, "plate=", vehicle.plate);

    return NextResponse.json({ vehicle });
  } catch (err: any) {
    // Olası CastError veya bağlantı hatası için
    console.error("Araç detayı hatası:", err?.message || err);
    return NextResponse.json(
      { message: "Araç bilgisi alınamadı.", detail: err?.message || "unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: "Yetkisiz" }, { status: 401 });
  }

  const resolvedParams =
    typeof (ctx as any).params?.then === "function"
      ? await (ctx as any).params
      : (ctx as any).params;

  const id = resolvedParams?.id?.trim();
  if (!id) {
    return NextResponse.json({ message: "Araç kimliği eksik." }, { status: 400 });
  }

  await connectDb();

  let vehicle = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    vehicle = await VehicleModel.findById(id);
  }
  if (!vehicle) {
    vehicle = await VehicleModel.findOne({ plate: id.toUpperCase() });
  }
  if (!vehicle) {
    return NextResponse.json({ message: "Araç bulunamadı." }, { status: 404 });
  }

  await FuelEntryModel.deleteMany({ vehicleId: vehicle._id });
  await VehicleModel.deleteOne({ _id: vehicle._id });

  return NextResponse.json({ message: "Araç silindi." }, { status: 200 });
}

