import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { connectDb } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { VehicleModel } from "@/models/Vehicle";

export const runtime = "nodejs";

type Row = {
  plaka?: string;
  Plate?: string;
  Plaka?: string;
  "License Plate"?: string;
  marka?: string;
  model?: string;
  "Marka / Model"?: string;
  marka_model?: string;
  odometre?: number | string;
  kilometre?: number | string;
  kilometre_deg?: number | string;
  driver?: string;
  surucu?: string;
  "Sürücü"?: string;
  "Sürücü Adı"?: string;
};

const normalizeRow = (row: Row) => {
  const plate =
    row.Plaka || row.plaka || row.Plate || row["License Plate"] || "";
  const makeModel =
    row["Marka / Model"] ||
    row.marka_model ||
    row.marka ||
    row.model ||
    "";
  const odometer =
    Number(row.odometre ?? row.kilometre ?? row.kilometre_deg) || 0;
  const driverName =
    row.surucu || row["Sürücü"] || row["Sürücü Adı"] || row.driver || "";

  return {
    plate: plate.trim().toUpperCase(),
    makeModel: makeModel.toString().trim(),
    odometer,
    driverName: driverName.toString().trim(),
  };
};

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: "Yetkisiz" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { message: "Excel dosyası yüklenmedi." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });

  const documents = rows
    .map(normalizeRow)
    .filter(
      (row) =>
        row.plate &&
        row.makeModel &&
        row.odometer > 0 &&
        row.driverName.length > 0
    );

  if (!documents.length) {
    return NextResponse.json(
      { message: "Geçerli satır bulunamadı." },
      { status: 400 }
    );
  }

  await connectDb();

  const operations = documents.map((doc) => ({
    updateOne: {
      filter: { plate: doc.plate },
      update: { $set: doc },
      upsert: true,
    },
  }));

  await VehicleModel.bulkWrite(operations, { ordered: false });

  return NextResponse.json({
    message: "Araçlar içe aktarıldı",
    processed: documents.length,
  });
}

