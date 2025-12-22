"use client";

 "use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem("hmf2-theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

  const applyTheme = useCallback((next: Theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    const isDark = next === "dark";
    root.classList.toggle("dark", isDark);
    body.classList.toggle("dark", isDark);
    root.setAttribute("data-theme", next);
    root.style.setProperty("color-scheme", next);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem("hmf2-theme", theme);
  }, [applyTheme, theme]);

  const setTheme = useCallback(
    (next: Theme | ((prev: Theme) => Theme)) => {
      setThemeState((prev) => {
        const value = typeof next === "function" ? (next as (p: Theme) => Theme)(prev) : next;
        applyTheme(value);
        window.localStorage.setItem("hmf2-theme", value);
        return value;
      });
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, [setTheme]);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme sadece ThemeProvider içinde kullanılabilir.");
  }
  return ctx;
};

