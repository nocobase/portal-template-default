"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "rounded-xl",
        "border-border/70",
        "bg-background/60",
        className,
        "h-10",
        "w-10"
      )}
    >
      <Sun
        className={cn(
          "h-[1.2rem]",
          "w-[1.2rem]",
          "rotate-0",
          "scale-100",
          "transition-all",
          "duration-200",
          {
            "-rotate-90 scale-0": theme === "dark",
          }
        )}
      />
      <Moon
        className={cn(
          "absolute",
          "h-[1.2rem]",
          "w-[1.2rem]",
          "rotate-90",
          "scale-0",
          "transition-all",
          "duration-200",
          {
            "rotate-0 scale-100": theme === "dark",
            "rotate-90 scale-0": theme === "light",
          }
        )}
      />
      <span className="sr-only">
        Switch to {theme === "dark" ? "light" : "dark"} mode
      </span>
    </Button>
  );
}

ThemeToggle.displayName = "ThemeToggle";
