"use client";

import * as React from "react";

import {
  applyTheme,
  DEFAULT_CONFIG,
  sanitizeConfig,
  shuffleConfig,
  STORAGE_KEY,
  type ThemeConfig,
} from "@/lib/theme-presets";

type ThemeContextValue = {
  /** Live/preview config currently painted on screen. */
  draft: ThemeConfig;
  /** Last config the user committed with "Apply". */
  applied: ThemeConfig;
  dirty: boolean;
  setField: <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => void;
  shuffle: () => void;
  apply: () => void;
  reset: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function readStored(): ThemeConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return sanitizeConfig(JSON.parse(raw) as Partial<ThemeConfig>);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [applied, setApplied] = React.useState<ThemeConfig>(DEFAULT_CONFIG);
  const [draft, setDraft] = React.useState<ThemeConfig>(DEFAULT_CONFIG);

  // Hydrate from storage on mount, then keep the DOM in sync with the draft.
  React.useEffect(() => {
    const stored = readStored();
    setApplied(stored);
    setDraft(stored);
  }, []);

  React.useEffect(() => {
    applyTheme(draft);
  }, [draft]);

  const setField = React.useCallback(
    <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => {
      setDraft((prev) => {
        const next = { ...prev, [key]: value };
        // Selecting a "Style" also nudges its paired heading font, like tweakcn.
        if (key === "style") {
          const style = value as ThemeConfig["style"];
          const paired = {
            sera: "instrument-serif",
            default: "geist",
            rounded: "space-grotesk",
            sharp: "sora",
          } as const;
          next.heading = paired[style];
        }
        return next;
      });
    },
    []
  );

  const shuffle = React.useCallback(() => {
    setDraft((prev) => shuffleConfig(prev));
  }, []);

  const apply = React.useCallback(() => {
    setDraft((current) => {
      setApplied(current);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch {
        // ignore quota / privacy-mode errors
      }
      return current;
    });
  }, []);

  const reset = React.useCallback(() => {
    setDraft(applied);
  }, [applied]);

  const dirty = React.useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(applied),
    [draft, applied]
  );

  const value = React.useMemo(
    () => ({ draft, applied, dirty, setField, shuffle, apply, reset }),
    [draft, applied, dirty, setField, shuffle, apply, reset]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
