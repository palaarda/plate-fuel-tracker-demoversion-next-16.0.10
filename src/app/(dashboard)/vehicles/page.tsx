"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Vehicle = {
  _id: string;
  plate: string;
  makeModel: string;
  odometer: number;
  driverName: string;
};

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    plate: "",
    makeModel: "",
    odometer: "",
    driverName: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadVehicles = async () => {
    const res = await fetch("/api/vehicles", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setVehicles(data.vehicles || []);
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const filtered = vehicles.filter((v) =>
    v.plate.toLowerCase().includes(filter.trim().toLowerCase())
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          odometer: Number(form.odometer),
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (_e) {
        // JSON body yoksa data null kalsın
      }
      if (!res.ok) throw new Error(data?.message || "Araç eklenemedi");

      setForm({ plate: "", makeModel: "", odometer: "", driverName: "" });
      setMessage("Araç kaydı oluşturuldu.");
      loadVehicles();
    } catch (err: any) {
      setMessage(err.message || "Beklenmeyen hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("importFile") as
      | HTMLInputElement
      | null;

    const file = input?.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/vehicles/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "İçe aktarma başarısız");

      setMessage(`İçe aktarma tamamlandı (${data.processed} satır).`);
      loadVehicles();
      e.currentTarget.reset();
    } catch (err: any) {
      setMessage(err.message || "İçe aktarma sırasında hata oluştu.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-1">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Araç Ekle</h2>
              <p className="text-sm text-slate-300">
                Yeni araç eklemek için formu açın.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowForm((s) => !s)}
            >
              {showForm ? "Formu gizle" : "Yeni araç"}
            </button>
          </div>

          {showForm ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="label">Plaka</label>
                <input
                  className="input"
                  value={form.plate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, plate: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Marka / Model</label>
                <input
                  className="input"
                  value={form.makeModel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, makeModel: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Aktif Kilometre</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.odometer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, odometer: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Aktif Sürücü</label>
                <input
                  className="input"
                  value={form.driverName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, driverName: e.target.value }))
                  }
                  required
                />
              </div>

              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Kaydediliyor..." : "Araç ekle"}
              </button>
            </form>
          ) : null}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Excel ile içe aktar</h3>
            <span className="text-xs text-slate-300">.xlsx / .xls</span>
          </div>
          <form onSubmit={handleImport} className="mt-3 space-y-3">
            <input
              type="file"
              name="importFile"
              accept=".xlsx,.xls"
              className="block w-full text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-[#6B1836]/30 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:cursor-pointer"
              required
            />
            <button className="btn-primary w-full" disabled={importing}>
              {importing ? "İçe aktarılıyor..." : "Excel yükle"}
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-300">
            Beklenen sütunlar: Plaka, Marka/Model, Kilometre, Sürücü.
          </p>
        </div>

        {message ? (
          <div className="rounded-xl border border-[#6B1836]/40 bg-[#6B1836]/10 px-3 py-2 text-sm text-[#6B1836]">
            {message}
          </div>
        ) : null}
      </div>

      <div className="card xl:col-span-2">
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Araç Listesi</h2>
            <p className="text-sm text-slate-300">
              Toplam {vehicles.length} kayıt
            </p>
            <p className="text-xs text-slate-400">
              Satıra tıklayarak detaya gidebilirsiniz.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2">
              <input
                className="input w-40 bg-slate-900/40 text-sm"
                placeholder="Plaka ara"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <button
                className="btn-ghost text-sm"
                onClick={() => setFilter("")}
                disabled={!filter}
              >
                Temizle
              </button>
            </div>
            <button
              className="btn-ghost text-sm"
              onClick={loadVehicles}
              disabled={loading}
            >
              Yenile
            </button>
          </div>
        </div>
        <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-300">
              {vehicles.length === 0 ? "Henüz kayıt yok." : "Eşleşen plaka bulunamadı."}
            </div>
          ) : (
            filtered.map((vehicle) => (
              <button
                key={vehicle._id}
                onClick={() => router.push(`/vehicles/${vehicle._id}`)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/5"
                style={{ cursor: "pointer" }}
              >
                <div>
                  <div className="text-sm font-semibold text-white">
                    {vehicle.plate}
                  </div>
                  <div className="text-xs text-white">
                    {vehicle.makeModel} • {vehicle.driverName}
                  </div>
                </div>
                <div className="text-sm text-white">
                  {vehicle.odometer.toLocaleString("tr-TR")} km
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

