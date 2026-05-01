import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed }: Props) {
  const { theme, setTheme } = useTheme();

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="mx-auto flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground"
        aria-label="Cambiar tema"
      >
        {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    );
  }

  const baseTab =
    "flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[12px] font-medium transition-colors";
  const active = "bg-[hsl(var(--sidebar-accent))] text-sidebar-foreground";
  const inactive = "text-sidebar-muted hover:text-sidebar-foreground";

  return (
    <div className="flex w-full gap-1 rounded-md border border-sidebar-border p-1">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`${baseTab} ${theme === "light" ? active : inactive}`}
        aria-pressed={theme === "light"}
      >
        <Sun className="h-3.5 w-3.5" />
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`${baseTab} ${theme === "dark" ? active : inactive}`}
        aria-pressed={theme === "dark"}
      >
        <Moon className="h-3.5 w-3.5" />
        Dark
      </button>
    </div>
  );
}
