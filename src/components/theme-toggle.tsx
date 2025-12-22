"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { useTheme } from "./theme-provider";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:scale-105 hover:border-indigo-400/60 hover:text-white"
      aria-label="Tema değiştir"
      title={isDark ? "Açık moda geç" : "Koyu moda geç"}
    >
      {isDark ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
    </button>
  );
};

