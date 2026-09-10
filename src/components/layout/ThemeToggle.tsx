import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggleResolved, ready } = useTheme();
  const isDark = resolved === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("size-9 shrink-0 rounded-full", className)}
      onClick={toggleResolved}
      aria-label={isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
      title={isDark ? "وضع فاتح" : "وضع داكن"}
      disabled={!ready}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
