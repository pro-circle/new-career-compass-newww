import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { getStoredTheme, setTheme, applyTheme, type Theme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setLocal] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = getStoredTheme();
    setLocal(t);
    applyTheme(t);
    setMounted(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function cycle() {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setLocal(next);
    setTheme(next);
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${label} (click to change)`}
      title={`Theme: ${label}`}
      className={`grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground ${className}`}
    >
      {mounted ? <Icon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
