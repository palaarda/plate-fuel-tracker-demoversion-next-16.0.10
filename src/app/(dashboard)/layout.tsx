import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { getSessionFromCookies } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSessionFromCookies();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 text-slate-900 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:text-slate-50">
      <Sidebar userName={session?.name || session?.username} />
      <div className="flex-1 bg-white/70 p-4 transition-colors dark:bg-slate-950/40 sm:p-6 md:p-8">
        <Topbar userName={session?.name || session?.username} />
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}

