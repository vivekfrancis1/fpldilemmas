import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "fpl-theme";

function stored(): "light" | "dark" {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "light") return v;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyStoredTheme() {
  document.documentElement.classList.toggle("dark", stored() === "dark");
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => stored());
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      data-testid="button-theme-toggle"
      onClick={() => {
        try { localStorage.setItem(KEY, next); } catch {}
        setTheme(next);
      }}
      className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors hover:bg-white/10 ${className}`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
