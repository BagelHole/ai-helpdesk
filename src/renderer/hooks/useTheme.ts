import { useEffect, useState } from "react";
import { useAppStore } from "./useAppStore";

type Theme = "light" | "dark" | "system";

export const useTheme = () => {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const theme = settings?.ui?.theme || "system";

  useEffect(() => {
    const updateResolvedTheme = () => {
      if (theme === "system") {
        const systemPrefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        setResolvedTheme(systemPrefersDark ? "dark" : "light");
      } else {
        setResolvedTheme(theme as "light" | "dark");
      }
    };

    updateResolvedTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        updateResolvedTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    updateSettings({
      ui: {
        theme: newTheme,
      },
    });
  };

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return {
    theme: resolvedTheme,
    themePreference: theme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === "dark",
    isLight: resolvedTheme === "light",
  };
};
