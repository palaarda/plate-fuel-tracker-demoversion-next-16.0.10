import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
const cards = [
    {
        title: "Araçlar",
        description: "Araç ekle, listele ve Excel'den içe aktar.",
        href: "/vehicles",
        status: "Aktif",
    },
    {
        title: "Yakıt Takibi",
        description: "Alınan yakıt kayıtlarını görüntüle ve ara.",
        href: "/fuel",
        status: "Aktif",
    },
    {
        title: "Görev Oluştur",
        description: "Planlı görevler (tam sürümde).",
        href: "/tasks",
        status: "Kilitli",
    },
    {
        title: "Kullanıcı Yönetimi",
        description: "Roller ve yetkiler (tam sürümde).",
        href: "/users",
        status: "Kilitli",
    },
    {
        title: "Raporlama",
        description: "Detaylı raporlar (tam sürümde).",
        href: "/reports",
        status: "Kilitli",
    },
];
export default async function DashboardHome() {
    const user = await getCurrentUser();
if (!user) {
  redirect("/auth/expired");
}
    return (<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (<Link key={card.title} href={card.href} className="card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-[#6B1836]/50">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{card.title}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${card.status === "Aktif"
                ? "bg-emerald-500/20 text-emerald-200"
                : "bg-amber-500/20 text-amber-100"}`}>
              {card.status}
            </span>
          </div>
          <p className="text-sm text-slate-200/90">{card.description}</p>
          <div className="mt-4 text-xs uppercase tracking-wide text-[#6B1836]/80">
            İncele →
          </div>
          {card.status === "Kilitli" ? (<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/30 to-slate-950/70"/>) : null}
        </Link>))}
    </div>);
}
