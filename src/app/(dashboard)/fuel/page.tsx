"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
type FuelEntry = {
  _id: string;
  vehicleId?: string;
  plate: string;
    liters: number;
    amount: number;
    createdAt: string;
};
export default function FuelPage() {
    const router = useRouter();
    const [entries, setEntries] = useState<FuelEntry[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [range, setRange] = useState<{
        from: string;
        to: string;
    }>({ from: "", to: "" });
    const [message, setMessage] = useState<string | null>(null);
    const [showExport, setShowExport] = useState(false);
    const loadEntries = async (plate?: string) => {
        setLoading(true);
        setMessage(null);
        try {
            const url = new URL("/api/fuel", window.location.origin);
            if (plate)
                url.searchParams.set("plate", plate);
            const res = await fetch(url.toString());
            const data = await res.json();
            if (!res.ok)
                throw new Error(data?.message || "Kayıtlar alınamadı.");
            setEntries(data.entries || []);
        }
        catch (err: unknown) {
            setMessage(getErrorMessage(err, "Liste yüklenemedi."));
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadEntries();
    }, []);
    const handleExport = async (mode: {
        months?: 1;
        days?: 7 | 1;
        from?: string;
        to?: string;
    }) => {
        setExporting(true);
        setMessage(null);
        try {
            const params = new URLSearchParams();
            if (mode.months)
                params.set("months", String(mode.months));
            if (mode.days)
                params.set("days", String(mode.days));
            if (mode.from && mode.to) {
                params.set("from", mode.from);
                params.set("to", mode.to);
            }
            const res = await fetch(`/api/fuel/export?${params.toString()}`, {
                credentials: "include",
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.message || "Excel indirilemedi.");
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const todayDate = new Date();
            const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
            const suffix = mode.from && mode.to
                ? `${mode.from}_${mode.to}`
                : mode.days === 1
                    ? `bugun-${today}`
                    : mode.days === 7
                        ? `1hafta`
                        : `1ay`;
            a.download = `yakit-${suffix}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        }
        catch (err: unknown) {
            setMessage(getErrorMessage(err, "Excel indirilemedi."));
        }
        finally {
            setExporting(false);
        }
    };
    const handleSearch = async (e: FormEvent) => {
        e.preventDefault();
        const plate = query.trim();
        if (!plate) {
            loadEntries();
            return;
        }
        try {
            setLoading(true);
            setMessage(null);
            const target = `/api/vehicles/${encodeURIComponent(plate.toUpperCase())}`;
            const res = await fetch(target, { credentials: "include" });
            if (res.status === 404) {
                setMessage("Araç bilgisi bulunamadı.");
                return;
            }
            if (!res.ok) {
                setMessage("Araç bilgisi alınamadı.");
                return;
            }
            router.push(`/vehicles/${plate.toUpperCase()}`);
        }
        catch (err: unknown) {
            setMessage(getErrorMessage(err, "Araç bilgisi alınamadı."));
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="space-y-4">
      <form onSubmit={handleSearch} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1">
          <label className="label">Plaka ile ara</label>
          <input className="input" placeholder="34 ABC 123" value={query} onChange={(e) => setQuery(e.target.value)}/>
        </div>
        <button className="btn-primary w-full sm:w-auto" disabled={loading}>
          Ara
        </button>
        <button type="button" className="btn-ghost w-full sm:w-auto" onClick={() => {
            setQuery("");
            loadEntries();
        }}>
          Temizle
        </button>
        <div className="flex flex-1 justify-end">
          <button type="button" className="btn bg-emerald-600 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500" onClick={() => setShowExport(true)}>
            Excel indir
          </button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Yakıt Kayıtları</h2>
            <p className="text-sm text-slate-300">
              En son alınan yakıt kayıtları listelenir.
            </p>
          </div>
          <button className="btn-ghost text-sm" onClick={() => loadEntries(query || undefined)} disabled={loading}>
            Yenile
          </button>
        </div>
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead>
              <tr className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-300">
                <th className="px-4 py-3">Plaka</th>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Litre</th>
                <th className="px-4 py-3">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.length === 0 ? (<tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-300">
                    {loading ? "Yükleniyor..." : "Kayıt bulunamadı."}
                  </td>
                </tr>) : (entries.map((entry) => (<tr key={entry._id} className="cursor-pointer transition hover:bg-white/5" tabIndex={0} onClick={() => router.push(`/vehicles/${entry.vehicleId || entry.plate.toUpperCase()}`)}>
                    <td className="px-4 py-3 font-semibold text-white">
                      {entry.plate}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {new Date(entry.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {entry.liters} L
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      ₺ {entry.amount.toLocaleString("tr-TR")}
                    </td>
                  </tr>)))}
            </tbody>
          </table>
        </div>
      </div>

      {message ? (<div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {message}
        </div>) : null}

      {showExport ? (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#6B1836]">
                  Yakıt Excel Dışa Aktar
                </p>
                <h3 className="text-lg font-semibold">Aralık Seçimi</h3>
              </div>
              <button type="button" className="btn-ghost text-sm" onClick={() => setShowExport(false)}>
                Kapat
              </button>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost border border-[#6B1836]/40 text-sm text-[#6B1836] hover:border-[#6B1836] hover:bg-[#6B1836]/10" onClick={() => handleExport({ months: 1 })} disabled={exporting}>
                  1 aylık Excel
                </button>
                <button type="button" className="btn-ghost border border-[#6B1836]/40 text-sm text-[#6B1836] hover:border-[#6B1836] hover:bg-[#6B1836]/10" onClick={() => handleExport({ days: 7 })} disabled={exporting}>
                  1 haftalık Excel
                </button>
              <button type="button" className="btn-ghost border border-[#6B1836]/40 text-sm text-[#6B1836] hover:border-[#6B1836] hover:bg-[#6B1836]/10" onClick={() => handleExport({ days: 1 })} disabled={exporting}>
                Bugün (Excel)
              </button>
              </div>
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm text-slate-200">Manuel tarih aralığı</div>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" className="input w-40 bg-slate-900/40 text-sm" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}/>
                  <span className="text-slate-400">-</span>
                  <input type="date" className="input w-40 bg-slate-900/40 text-sm" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}/>
                  <button type="button" className="btn-ghost border border-emerald-500/30 text-sm text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/10" onClick={() => {
                if (!range.from || !range.to) {
                    setMessage("Başlangıç ve bitiş tarihi seçin.");
                    return;
                }
                handleExport({ from: range.from, to: range.to });
            }} disabled={exporting}>
                    Aralığı indir
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Seçilen aralık, başlangıç ve bitiş tarihleri dahil edilerek dışa aktarılır.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button type="button" className="btn-ghost text-sm" onClick={() => setShowExport(false)}>
                Vazgeç
              </button>
            </div>
          </div>
        </div>) : null}
    </div>);
}
