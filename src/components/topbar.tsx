"use client";

import { usePathname } from "next/navigation";
import { UserIcon } from "@heroicons/react/24/solid";

type Props = {
  userName?: string;
};

export const Topbar = ({ userName }: Props) => {
  const pathname = usePathname();
  const titleMap: Record<string, string> = {
    "/": "Özet",
    "/vehicles": "Araçlar",
    "/fuel": "Yakıt Takibi",
  };

  const title =
    titleMap[pathname] || "HMF Demo Panel" + (pathname ? ` (${pathname})` : "");

  return (
    <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-slate-900 shadow-sm shadow-black/10 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white">
      <div>
        <p className="text-xs uppercase tracking-wide text-[#6B1836]">
          Kontrol Paneli
        </p>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1 text-sm text-slate-100">
          <UserIcon className="h-5 w-5 text-white" />
          <span className="hidden sm:inline">{userName || "Kullanıcı"}</span>
        </div>
      </div>
    </header>
  );
};

