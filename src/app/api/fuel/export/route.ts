import { NextResponse } from "next/server";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import { jsonError, requireAuth, withErrorHandling } from "@/lib/api";
import { FuelEntryModel } from "@/models/FuelEntry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MONTHS = [1];
const VALID_DAYS = [7, 1];
const MAX_RANGE_DAYS = 366;
const MAX_EXPORT_ROWS = 50_000;
const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const endOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

type ExportRow = {
  Tarih: string;
  Plaka: string;
  Litre: number | "";
  Tutar: number;
};

export const GET = withErrorHandling("fuel:export", async (request: Request) => {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const months = searchParams.get("months");
  const days = searchParams.get("days");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let start: Date;
  let end: Date = new Date();

  if (fromParam && toParam) {
    if (!DATE_PARAM_PATTERN.test(fromParam) || !DATE_PARAM_PATTERN.test(toParam)) {
      return jsonError("Geçersiz tarih formatı.", 400);
    }
    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return jsonError("Geçersiz tarih formatı.", 400);
    }
    if (fromDate > toDate) {
      return jsonError("Başlangıç tarihi bitişten büyük olamaz.", 400);
    }
    if (toDate.getTime() - fromDate.getTime() > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) {
      return jsonError(`Tarih aralığı en fazla ${MAX_RANGE_DAYS} gün olabilir.`, 400);
    }
    start = startOfDay(fromDate);
    end = endOfDay(toDate);
  } else if (days) {
    const d = Number(days);
    if (!VALID_DAYS.includes(d)) {
      return jsonError("Geçersiz süre (1 hafta veya bugünün günü destekleniyor).", 400);
    }
    if (d === 1) {
      start = startOfDay(end);
      end = endOfDay(end);
    } else {
      start = new Date(end);
      start.setDate(start.getDate() - d);
    }
  } else {
    const m = Number(months || "1");
    if (!VALID_MONTHS.includes(m)) {
      return jsonError("Geçersiz süre (1 ay veya tarih aralığı kullanın).", 400);
    }
    start = new Date(end);
    start.setMonth(start.getMonth() - m);
  }

  const entries = await FuelEntryModel.find({
    createdAt: mongoose.trusted({ $gte: start, $lte: end }),
  })
    .select("plate liters amount createdAt")
    .sort({ createdAt: -1 })
    .limit(MAX_EXPORT_ROWS)
    .lean();

  const rows: ExportRow[] = entries.map((e) => ({
    Tarih: new Date(e.createdAt).toLocaleString("tr-TR"),
    Plaka: e.plate,
    Litre: e.liters,
    Tutar: e.amount,
  }));

  const total = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
  rows.push({
    Tarih: "",
    Plaka: "TOPLAM",
    Litre: "",
    Tutar: total,
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Yakıt");
  const buffer: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const startName = formatDate(start);
  const endName = formatDate(end);

  let suffix = `1ay`;
  if (days === "7") suffix = `1hafta`;
  if (days === "1") suffix = `bugun-${endName}`;
  if (fromParam && toParam) suffix = `${startName}_${endName}`;

  const filename = `yakit-${suffix}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
