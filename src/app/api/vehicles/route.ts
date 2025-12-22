import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { VehicleModel } from "@/models/Vehicle";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: "Yetkisiz" }, { status: 401 });
  }

  const conn = await connectDb();
  const vehicles = await VehicleModel.find().sort({ createdAt: -1 }).lean();
  console.log(
    "[vehicles:list]",
    conn?.name,
    "count=",
    vehicles.length
  );
  return NextResponse.json({ vehicles });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: "Yetkisiz" }, { status: 401 });
  }

  const { plate, makeModel, odometer, driverName } = await request.json();

  if (!plate || !makeModel || !odometer || !driverName) {
    return NextResponse.json(
      { message: "Plaka, marka/model, kilometre ve sürücü zorunludur." },
      { status: 400 }
    );
  }

  await connectDb();
  try {
    const vehicle = await VehicleModel.create({
      plate: String(plate).trim().toUpperCase(),
      makeModel: makeModel.trim(),
      odometer: Number(odometer),
      driverName: driverName.trim(),
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "Bu plaka zaten kayıtlı." },
        { status: 409 }
      );
    }

    console.error("Araç kaydı hatası:", error);
    return NextResponse.json(
      { message: "Araç kaydedilirken hata oluştu." },
      { status: 500 }
    );
  }
}

