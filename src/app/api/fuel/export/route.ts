import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { FuelEntryModel } from "@/models/FuelEntry";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MONTHS = [1];
const VALID_DAYS = [7, 1]; // 1 gün (bugün) için destek

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: "Yetkisiz" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const months = searchParams.get("months");
  const days = searchParams.get("days");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let start: Date | null = null;
  let end: Date = new Date();
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

  // Manuel tarih aralığı öncelikli
  if (fromParam && toParam) {
    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ message: "Geçersiz tarih formatı." }, { status: 400 });
    }
    if (fromDate > toDate) {
      return NextResponse.json({ message: "Başlangıç tarihi bitişten büyük olamaz." }, { status: 400 });
    }
    start = startOfDay(fromDate);
    end = endOfDay(toDate);
  } else if (days) {
    const d = Number(days);
    if (!VALID_DAYS.includes(d)) {
      return NextResponse.json({ message: "Geçersiz süre (1 hafta veya bugünün günü destekleniyor)." }, { status: 400 });
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
      return NextResponse.json({ message: "Geçersiz süre (1 ay veya tarih aralığı kullanın)." }, { status: 400 });
    }
    start = new Date(end);
    start.setMonth(start.getMonth() - m);
  }

  await connectDb();

  const entries = await FuelEntryModel.find({
    createdAt: { $gte: start, $lte: end },
  })
    .sort({ createdAt: -1 })
    .lean();

  const rows = entries.map((e) => ({
    Tarih: new Date(e.createdAt!).toLocaleString("tr-TR"),
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
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const todayStr = formatDate(new Date());
  const startName = start ? formatDate(start) : todayStr;
  const endName = end ? formatDate(end) : todayStr;

  let suffix = `1ay`;
  if (days === "7") suffix = `1hafta`;
  if (days === "1") suffix = `bugun-${endName}`;
  if (fromParam && toParam) suffix = `${startName}_${endName}`;

  const filename = `yakit-${suffix}.xlsx`; // ASCII dosya adı (header uyumu için)

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

