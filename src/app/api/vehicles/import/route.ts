import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { jsonError, requireAuth, withErrorHandling } from "@/lib/api";
import { validateVehicleInput, type VehicleInput } from "@/lib/validation";
import { assertSafeZip } from "@/lib/zip-guard";
import { VehicleModel } from "@/models/Vehicle";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILE_BYTES + 64 * 1024;
const MAX_ROWS = 1000;
const MAX_REPORTED_ERRORS = 10;

const XLSX_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const XLS_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const hasSignature = (bytes: Uint8Array, signature: number[]) =>
  signature.every((byte, i) => bytes[i] === byte);

const COLUMN_ALIASES = {
  plate: ["Plaka", "plaka", "Plate", "License Plate"],
  makeModel: ["Marka / Model", "Marka/Model", "marka_model", "marka", "model"],
  odometer: ["odometre", "kilometre", "Kilometre", "kilometre_deg"],
  driverName: ["surucu", "Sürücü", "Sürücü Adı", "driver"],
} as const;

type Row = Record<string, unknown>;

const pick = (row: Row, keys: readonly string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

export const POST = withErrorHandling("vehicles:import", async (request: Request) => {
  const auth = await requireAuth({ admin: true });
  if (!auth.ok) return auth.response;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonError("Dosya en fazla 2 MB olabilir.", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Geçersiz form verisi.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("Excel dosyası yüklenmedi.", 400);
  }
  if (file.size === 0) {
    return jsonError("Dosya boş.", 400);
  }
  if (file.size > MAX_FILE_BYTES) {
    return jsonError("Dosya en fazla 2 MB olabilir.", 413);
  }

  const extension = file.name.toLowerCase().split(".").pop();
  if (extension !== "xlsx" && extension !== "xls") {
    return jsonError("Yalnızca .xlsx veya .xls dosyaları kabul edilir.", 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const signatureOk =
    extension === "xlsx" ? hasSignature(bytes, XLSX_SIGNATURE) : hasSignature(bytes, XLS_SIGNATURE);
  if (!signatureOk) {
    return jsonError("Dosya içeriği geçerli bir Excel dosyası değil.", 415);
  }

  if (extension === "xlsx") {
    try {
      assertSafeZip(bytes);
    } catch {
      return jsonError("Excel dosyası güvenlik denetiminden geçemedi.", 400);
    }
  }

  let rows: Row[];
  try {
    const workbook = XLSX.read(bytes, {
      type: "array",
      sheets: 0,
      sheetRows: MAX_ROWS + 2,
      cellFormula: false,
      cellHTML: false,
      bookVBA: false,
    });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
    if (!sheet) {
      return jsonError("Excel dosyasında sayfa bulunamadı.", 400);
    }
    rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
  } catch {
    return jsonError("Excel dosyası okunamadı.", 400);
  }

  if (rows.length > MAX_ROWS) {
    return jsonError(`Tek seferde en fazla ${MAX_ROWS} satır içe aktarılabilir.`, 400);
  }

  const byPlate = new Map<string, VehicleInput>();
  const errors: string[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const parsed = validateVehicleInput({
      plate: pick(row, COLUMN_ALIASES.plate),
      makeModel: pick(row, COLUMN_ALIASES.makeModel),
      odometer: pick(row, COLUMN_ALIASES.odometer),
      driverName: pick(row, COLUMN_ALIASES.driverName),
    });
    if (!parsed.ok) {
      skipped += 1;
      if (errors.length < MAX_REPORTED_ERRORS) {
        errors.push(`Satır ${index + 2}: ${parsed.message}`);
      }
      return;
    }
    byPlate.set(parsed.value.plate, parsed.value);
  });

  const documents = Array.from(byPlate.values());
  if (!documents.length) {
    return NextResponse.json({ message: "Geçerli satır bulunamadı.", skipped, errors }, { status: 400 });
  }

  await VehicleModel.bulkWrite(
    documents.map((doc) => ({
      updateOne: {
        filter: { plate: doc.plate },
        update: { $set: doc },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  return NextResponse.json({
    message: "Araçlar içe aktarıldı",
    processed: documents.length,
    skipped,
    errors,
  });
});
