"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
type Vehicle = {
    _id: string;
    plate: string;
    makeModel: string;
    odometer: number;
    driverName: string;
    createdAt?: string;
};
type FuelEntry = {
    _id: string;
    liters: number;
    amount: number;
    createdAt: string;
};
export default function VehicleDetailPage() {
    const { id } = useParams<{
        id: string;
    }>();
    const router = useRouter();
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ liters: "", amount: "" });
    const [message, setMessage] = useState<string | null>(null);
    const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
    const [entriesLoading, setEntriesLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deletingFuel, setDeletingFuel] = useState(false);
    useEffect(() => {
        const fetchVehicle = async () => {
            setMessage(null);
            if (!id)
                return;
            const res = await fetch(`/api/vehicles/${id}`, { credentials: "include" });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            if (res.status === 404) {
                setVehicle(null);
                setLoading(false);
                return;
            }
            const data = await res.json();
            if (!res.ok) {
                setMessage(data?.message || "Araç detayları alınamadı.");
                setVehicle(null);
                setLoading(false);
                return;
            }
            setVehicle(data.vehicle);
            setLoading(false);
            if (data.vehicle?.plate) {
                void loadFuelEntries(data.vehicle.plate);
            }
        };
        fetchVehicle();
    }, [id, router]);
    const loadFuelEntries = async (plate: string) => {
        setEntriesLoading(true);
        try {
            const res = await fetch(`/api/fuel?plate=${encodeURIComponent(plate)}`, {
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data?.message || "Yakıt kayıtları alınamadı.");
            setFuelEntries(data.entries || []);
        }
        catch (err: unknown) {
            setMessage(getErrorMessage(err, "Yakıt kayıtları alınamadı."));
        }
        finally {
            setEntriesLoading(false);
        }
    };
    const handleFuel = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        const res = await fetch(`/api/vehicles/${id}/fuel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                liters: Number(form.liters),
                amount: Number(form.amount),
            }),
        });
        const data = await res.json();
        if (!res.ok) {
            setMessage(data?.message || "Yakıt kaydedilemedi.");
            return;
        }
        setMessage("Yakıt kaydı eklendi.");
        setForm({ liters: "", amount: "" });
        if (vehicle?.plate) {
            void loadFuelEntries(vehicle.plate);
        }
    };
    const handleDelete = async () => {
        if (!vehicle)
            return;
        const ok = window.confirm(`${vehicle.plate} aracını ve ilişkili yakıt kayıtlarını silmek istediğine emin misin?`);
        if (!ok)
            return;
        setDeleting(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/vehicles/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data?.message || "Araç silinemedi.");
            router.push("/vehicles");
        }
        catch (err: unknown) {
            setMessage(getErrorMessage(err, "Araç silinemedi."));
        }
        finally {
            setDeleting(false);
        }
    };
    if (loading) {
        return (<div className="card p-5 text-slate-200">Araç detayları yükleniyor...</div>);
    }
    if (!vehicle) {
        return (<div className="card p-5 text-rose-200">Araç bilgisi bulunamadı.</div>);
    }
    return (<div className="grid gap-6 lg:grid-cols-3">
      <div className="card space-y-3 p-5 lg:col-span-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-white">
              Araç Detay
            </p>
            <h1 className="text-2xl font-semibold text-white">
              {vehicle.plate}
            </h1>
            <p className="text-sm text-white">{vehicle.makeModel}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost text-sm" onClick={() => router.back()} style={{ cursor: "pointer" }}>
              ← Listeye dön
            </button>
            <button className="btn bg-rose-600 text-sm font-semibold text-white transition hover:bg-rose-500" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Siliniyor..." : "Aracı sil"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white">Sürücü</p>
            <p className="text-lg font-semibold text-white">
              {vehicle.driverName}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white">Kilometre</p>
            <p className="text-lg font-semibold text-white">
              {vehicle.odometer.toLocaleString("tr-TR")} km
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white">Oluşturulma</p>
            <p className="text-lg font-semibold text-white">
              {vehicle.createdAt
            ? new Date(vehicle.createdAt).toLocaleString("tr-TR")
            : "—"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white">
                Son Yakıt Kayıtları
              </p>
              <h3 className="text-lg font-semibold text-white">{vehicle.plate}</h3>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost text-xs" disabled={entriesLoading} onClick={() => loadFuelEntries(vehicle.plate)} style={{ cursor: "pointer" }}>
                Yenile
              </button>
              <button className="btn bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-500" disabled={deletingFuel} onClick={async () => {
            const ok = window.confirm(`${vehicle.plate} aracına ait tüm yakıt kayıtlarını silmek istiyor musun?`);
            if (!ok)
                return;
            setDeletingFuel(true);
            setMessage(null);
            try {
                const res = await fetch(`/api/vehicles/${id}/fuel`, {
                    method: "DELETE",
                    credentials: "include",
                });
                const data = await res.json();
                if (!res.ok)
                    throw new Error(data?.message || "Yakıt kayıtları silinemedi.");
                setFuelEntries([]);
                setMessage("Yakıt kayıtları silindi.");
            }
            catch (err: unknown) {
                setMessage(getErrorMessage(err, "Yakıt kayıtları silinemedi."));
            }
            finally {
                setDeletingFuel(false);
            }
        }}>
                {deletingFuel ? "Siliniyor..." : "Yakıt kayıtlarını sil"}
              </button>
            </div>
          </div>
          {entriesLoading ? (<p className="text-sm text-white">Yükleniyor...</p>) : fuelEntries.length === 0 ? (<p className="text-sm text-white">Kayıt bulunamadı.</p>) : (<div className="divide-y divide-white/5">
              {fuelEntries.slice(0, 5).map((entry) => (<div key={entry._id} className="flex items-center justify-between py-2 text-sm">
                  <div className="text-slate-200">
                    {new Date(entry.createdAt).toLocaleString("tr-TR")}
                  </div>
                  <div className="text-white">
                    {entry.liters} L • ₺ {entry.amount.toLocaleString("tr-TR")}
                  </div>
                </div>))}
            </div>)}
          <p className="mt-2 text-xs text-white">
            Tüm kayıtlar “Yakıt Takibi” sekmesinde listelenir.
          </p>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-lg font-semibold text-white">Yakıt Alındı</h3>
        <p className="mb-4 text-sm text-white">
          Bu araç için yeni yakıt kaydı ekleyin.
        </p>
        <form onSubmit={handleFuel} className="space-y-3">
          <div>
            <label className="label">Alınan litre</label>
            <input className="input" type="number" min={0} value={form.liters} onChange={(e) => setForm((f) => ({ ...f, liters: e.target.value }))} required/>
          </div>
          <div>
            <label className="label">Ödenen tutar</label>
            <input className="input" type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required/>
          </div>
          <button className="btn-primary w-full">Kaydı ekle</button>
        </form>
        {message ? (<div className="mt-3 rounded-xl border border-[#6B1836]/40 bg-[#6B1836]/10 px-3 py-2 text-sm text-[#6B1836]">
            {message}
          </div>) : null}
        <p className="mt-3 text-xs text-slate-400">
          Yakıt kayıtları sadece Yakıt Takibi sekmesinde listelenir.
        </p>
      </div>
    </div>);
}
