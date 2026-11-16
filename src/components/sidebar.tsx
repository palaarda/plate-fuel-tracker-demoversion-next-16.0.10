"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LockClosedIcon, TruckIcon, FireIcon } from "@heroicons/react/24/solid";
type Props = {
    userName?: string;
};
const lockedMessage = "Bu özellik tam sürümde aktif olacaktır.";
export const Sidebar = ({ userName }: Props) => {
    const pathname = usePathname();
    const router = useRouter();
    const [message, setMessage] = useState<string | null>(null);
    const navItems = useMemo(() => [
        { href: "/vehicles", label: "Araçlar", locked: false, icon: TruckIcon },
        { href: "/fuel", label: "Yakıt Takibi", locked: false, icon: FireIcon },
        { href: "/tasks", label: "Görev Oluştur", locked: true },
        { href: "/users", label: "Kullanıcı Yönetimi", locked: true },
        { href: "/reports", label: "Raporlama", locked: true },
    ], []);
    const showMessage = () => {
        setMessage(lockedMessage);
        setTimeout(() => setMessage(null), 2200);
    };
    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };
    return (<aside className="sticky top-0 flex h-screen w-64 flex-col justify-between border-r border-slate-200/70 bg-white/80 p-4 text-slate-900 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/80 dark:text-slate-50 dark:shadow-[#6B1836]/10">
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6B1836] to-[#8f1f46] text-lg font-bold text-white">
            H
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Home of People</div>
            <div className="text-xs text-slate-300">Filo Yönetimi</div>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            if (item.locked) {
                return (<button key={item.label} type="button" onClick={showMessage} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-400 transition hover:bg-white/5" title="Kilitli özellik">
                  <span className="inline-flex items-center gap-2">
                    <LockClosedIcon className="h-4 w-4 text-slate-500" aria-hidden="true"/>
                    {item.label}
                  </span>
                </button>);
            }
            return (<Link key={item.label} href={item.href} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${isActive
                    ? "bg-white/10 text-white shadow-inner shadow-[#6B1836]/30"
                    : "text-slate-200 hover:bg-white/5"}`}>
                <span className="inline-flex items-center gap-2">
                  {item.icon ? <item.icon className="h-4 w-4"/> : null}
                  {item.label}
                </span>
              </Link>);
        })}
        </nav>

        {message ? (<div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {message}
          </div>) : null}
      </div>

      <div className="mt-auto flex flex-col items-center gap-[20px] pb-2">
        <div className="w-full space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
          <div className="text-slate-200">Merhaba, {userName || "Kullanıcı"}</div>
          <button className="btn w-full rounded-xl bg-white/10 text-slate-100 hover:bg-white/20" onClick={handleLogout}>
            Çıkış
          </button>
        </div>

        <a href="https://www.creoft.com" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-300 underline underline-offset-4 transition hover:text-white" style={{ fontFamily: '"Bebas Neue", sans-serif', letterSpacing: "0.08em" }}>
          Developed by CREOFT (V 0.1.0)
        </a>
      </div>
    </aside>);
};
