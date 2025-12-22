import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { FuelEntryModel } from "@/models/FuelEntry";
import { VehicleModel } from "@/models/Vehicle";
import mongoose from "mongoose";

type Params =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Params) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: "Yetkisiz" }, { status: 401 });
  }

  const { liters, amount } = await request.json();
  if (liters === undefined || amount === undefined) {
    return NextResponse.json(
      { message: "Litre ve tutar zorunludur." },
      { status: 400 }
    );
  }

  const resolvedParams =
    typeof (ctx as any).params?.then === "function"
      ? await (ctx as any).params
      : (ctx as any).params;

  const rawId = resolvedParams?.id;
  if (!rawId) {
    return NextResponse.json({ message: "Araç kimliği eksik." }, { status: 400 });
  }

  await connectDb();

  let vehicle = null;

  // ObjectId olarak dene
  if (mongoose.Types.ObjectId.isValid(rawId)) {
    vehicle = await VehicleModel.findById(rawId);
  }

  // ObjectId değilse ya da bulunamadıysa plaka ile ara
  if (!vehicle) {
    vehicle = await VehicleModel.findOne({ plate: rawId.toUpperCase() });
  }

  if (!vehicle) {
    return NextResponse.json({ message: "Araç bulunamadı." }, { status: 404 });
  }

  const entry = await FuelEntryModel.create({
    vehicleId: vehicle._id,
    plate: vehicle.plate,
    liters: Number(liters),
    amount: Number(amount),
  });

  return NextResponse.json({ entry }, { status: 201 });
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

  const rawId = resolvedParams?.id;
  if (!rawId) {
    return NextResponse.json({ message: "Araç kimliği eksik." }, { status: 400 });
  }

  await connectDb();

  let vehicle = null;
  if (mongoose.Types.ObjectId.isValid(rawId)) {
    vehicle = await VehicleModel.findById(rawId);
  }
  if (!vehicle) {
    vehicle = await VehicleModel.findOne({ plate: rawId.toUpperCase() });
  }
  if (!vehicle) {
    return NextResponse.json({ message: "Araç bulunamadı." }, { status: 404 });
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

