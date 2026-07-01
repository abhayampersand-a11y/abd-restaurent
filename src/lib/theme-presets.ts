// Theme preset data + CSS-variable generation for the in-app theme customizer.
// Everything is expressed in OKLCH so the palettes stay perceptually consistent.

export type Mode = "light" | "dark";

export type BaseKey = "stone" | "zinc" | "slate" | "gray" | "neutral";
export type AccentKey =
  | "lime"
  | "emerald"
  | "blue"
  | "violet"
  | "rose"
  | "amber"
  | "cyan"
  | "orange";
export type ChartKey = "cyan" | "blue" | "violet" | "emerald" | "amber" | "rose";
export type FontKey =
  | "geist"
  | "inter"
  | "jakarta"
  | "outfit"
  | "sora"
  | "manrope"
  | "dm-sans"
  | "montserrat"
  | "work-sans"
  | "figtree"
  | "lexend"
  | "nunito"
  | "poppins"
  | "space-grotesk"
  | "bricolage"
  | "playfair"
  | "instrument-serif"
  | "lora"
  | "merriweather"
  | "source-serif"
  | "fraunces"
  | "jetbrains-mono"
  | "geist-mono"
  | "fira-code"
  | "ibm-plex-mono"
  | "roboto-mono";
export type StyleKey = "sera" | "default" | "rounded" | "sharp";

export type ThemeConfig = {
  style: StyleKey;
  base: BaseKey;
  accent: AccentKey;
  chart: ChartKey;
  heading: FontKey;
  body: FontKey;
  mode: Mode;
};

export const DEFAULT_CONFIG: ThemeConfig = {
  style: "sera",
  base: "stone",
  accent: "lime",
  chart: "cyan",
  heading: "instrument-serif",
  body: "geist",
  mode: "dark",
};

// --- Option metadata (labels + preview swatches shown in the panel) -----------

export const BASE_COLORS: Record<
  BaseKey,
  { label: string; hue: number; chroma: number; swatch: string }
> = {
  stone: { label: "Stone", hue: 58, chroma: 0.004, swatch: "oklch(0.72 0.01 58)" },
  zinc: { label: "Zinc", hue: 286, chroma: 0.006, swatch: "oklch(0.72 0.01 286)" },
  slate: { label: "Slate", hue: 257, chroma: 0.013, swatch: "oklch(0.72 0.02 257)" },
  gray: { label: "Gray", hue: 264, chroma: 0.006, swatch: "oklch(0.72 0.01 264)" },
  neutral: { label: "Neutral", hue: 0, chroma: 0, swatch: "oklch(0.72 0 0)" },
};

// primary / brand accent — [lightness, chroma, hue]; fg is the on-accent text.
export const ACCENTS: Record<
  AccentKey,
  { label: string; l: number; c: number; h: number; fg: string }
> = {
  lime: { label: "Lime", l: 0.77, c: 0.2, h: 131, fg: "oklch(0.27 0.06 133)" },
  emerald: { label: "Emerald", l: 0.7, c: 0.15, h: 162, fg: "oklch(0.98 0.01 160)" },
  blue: { label: "Blue", l: 0.62, c: 0.19, h: 256, fg: "oklch(0.98 0.01 256)" },
  violet: { label: "Violet", l: 0.61, c: 0.22, h: 293, fg: "oklch(0.98 0.01 293)" },
  rose: { label: "Rose", l: 0.65, c: 0.22, h: 12, fg: "oklch(0.98 0.01 12)" },
  amber: { label: "Amber", l: 0.79, c: 0.16, h: 78, fg: "oklch(0.28 0.06 60)" },
  cyan: { label: "Cyan", l: 0.72, c: 0.13, h: 210, fg: "oklch(0.26 0.05 220)" },
  orange: { label: "Orange", l: 0.7, c: 0.19, h: 42, fg: "oklch(0.98 0.01 60)" },
};

export const CHART_COLORS: Record<ChartKey, { label: string; h: number }> = {
  cyan: { label: "Cyan", h: 210 },
  blue: { label: "Blue", h: 256 },
  violet: { label: "Violet", h: 293 },
  emerald: { label: "Emerald", h: 162 },
  amber: { label: "Amber", h: 78 },
  rose: { label: "Rose", h: 12 },
};

export const FONTS: Record<
  FontKey,
  { label: string; varName: string; category: "sans" | "serif" | "grotesk" | "mono" }
> = {
  // Sans
  geist: { label: "Geist", varName: "var(--font-geist-sans)", category: "sans" },
  inter: { label: "Inter", varName: "var(--font-inter)", category: "sans" },
  jakarta: { label: "Plus Jakarta Sans", varName: "var(--font-jakarta)", category: "sans" },
  outfit: { label: "Outfit", varName: "var(--font-outfit)", category: "sans" },
  sora: { label: "Sora", varName: "var(--font-sora)", category: "sans" },
  manrope: { label: "Manrope", varName: "var(--font-manrope)", category: "sans" },
  "dm-sans": { label: "DM Sans", varName: "var(--font-dm-sans)", category: "sans" },
  montserrat: { label: "Montserrat", varName: "var(--font-montserrat)", category: "sans" },
  "work-sans": { label: "Work Sans", varName: "var(--font-work-sans)", category: "sans" },
  figtree: { label: "Figtree", varName: "var(--font-figtree)", category: "sans" },
  lexend: { label: "Lexend", varName: "var(--font-lexend)", category: "sans" },
  nunito: { label: "Nunito", varName: "var(--font-nunito)", category: "sans" },
  poppins: { label: "Poppins", varName: "var(--font-poppins)", category: "sans" },
  // Grotesk / display
  "space-grotesk": {
    label: "Space Grotesk",
    varName: "var(--font-space-grotesk)",
    category: "grotesk",
  },
  bricolage: {
    label: "Bricolage Grotesque",
    varName: "var(--font-bricolage)",
    category: "grotesk",
  },
  // Serif
  playfair: {
    label: "Playfair Display",
    varName: "var(--font-playfair)",
    category: "serif",
  },
  "instrument-serif": {
    label: "Instrument Serif",
    varName: "var(--font-instrument-serif)",
    category: "serif",
  },
  lora: { label: "Lora", varName: "var(--font-lora)", category: "serif" },
  merriweather: {
    label: "Merriweather",
    varName: "var(--font-merriweather)",
    category: "serif",
  },
  "source-serif": {
    label: "Source Serif 4",
    varName: "var(--font-source-serif)",
    category: "serif",
  },
  fraunces: { label: "Fraunces", varName: "var(--font-fraunces)", category: "serif" },
  // Mono
  "jetbrains-mono": {
    label: "JetBrains Mono",
    varName: "var(--font-jetbrains-mono)",
    category: "mono",
  },
  "geist-mono": { label: "Geist Mono", varName: "var(--font-geist-mono)", category: "mono" },
  "fira-code": { label: "Fira Code", varName: "var(--font-fira-code)", category: "mono" },
  "ibm-plex-mono": {
    label: "IBM Plex Mono",
    varName: "var(--font-ibm-plex-mono)",
    category: "mono",
  },
  "roboto-mono": {
    label: "Roboto Mono",
    varName: "var(--font-roboto-mono)",
    category: "mono",
  },
};

// Heading can be anything (display faces included); body stays readable.
export const HEADING_FONT_KEYS: FontKey[] = Object.keys(FONTS) as FontKey[];
export const BODY_FONT_KEYS: FontKey[] = (Object.keys(FONTS) as FontKey[]).filter(
  (k) => FONTS[k].category !== "grotesk" || k === "space-grotesk"
).filter(
  // exclude high-contrast display serifs that read poorly as body copy
  (k) => !["playfair", "instrument-serif", "fraunces"].includes(k)
);

export const STYLES: Record<
  StyleKey,
  { label: string; radius: number; heading: FontKey }
> = {
  sera: { label: "Sera", radius: 0.5, heading: "instrument-serif" },
  default: { label: "Default", radius: 0.625, heading: "geist" },
  rounded: { label: "Rounded", radius: 1, heading: "space-grotesk" },
  sharp: { label: "Sharp", radius: 0, heading: "sora" },
};

// --- Neutral scale (lightness targets, matched to shadcn's default themes) ----

type NeutralValue = number | string;

const LIGHT_STEPS: Record<string, NeutralValue> = {
  background: 1,
  foreground: 0.145,
  card: 1,
  "card-foreground": 0.145,
  popover: 1,
  "popover-foreground": 0.145,
  secondary: 0.97,
  "secondary-foreground": 0.205,
  muted: 0.97,
  "muted-foreground": 0.556,
  accent: 0.97,
  "accent-foreground": 0.205,
  border: 0.922,
  input: 0.922,
  ring: 0.708,
  sidebar: 0.985,
  "sidebar-foreground": 0.145,
  "sidebar-accent": 0.97,
  "sidebar-accent-foreground": 0.205,
  "sidebar-border": 0.922,
  "sidebar-ring": 0.708,
};

const DARK_STEPS: Record<string, NeutralValue> = {
  background: 0.145,
  foreground: 0.985,
  card: 0.205,
  "card-foreground": 0.985,
  popover: 0.205,
  "popover-foreground": 0.985,
  secondary: 0.269,
  "secondary-foreground": 0.985,
  muted: 0.269,
  "muted-foreground": 0.708,
  accent: 0.269,
  "accent-foreground": 0.985,
  border: "oklch(1 0 0 / 10%)",
  input: "oklch(1 0 0 / 15%)",
  ring: 0.556,
  sidebar: 0.205,
  "sidebar-foreground": 0.985,
  "sidebar-accent": 0.269,
  "sidebar-accent-foreground": 0.985,
  "sidebar-border": "oklch(1 0 0 / 10%)",
  "sidebar-ring": 0.556,
};

function neutral(value: NeutralValue, hue: number, chroma: number): string {
  if (typeof value === "string") return value; // pre-baked alpha values
  // Pure white / black keep no chroma; everything else gets the base tint.
  const c = value >= 0.999 || value <= 0.001 ? 0 : chroma;
  return `oklch(${value} ${c} ${hue})`;
}

function chartVars(h: number): Record<string, string> {
  return {
    "chart-1": `oklch(0.78 0.13 ${h})`,
    "chart-2": `oklch(0.66 0.13 ${h})`,
    "chart-3": `oklch(0.55 0.12 ${h})`,
    "chart-4": `oklch(0.46 0.1 ${h})`,
    "chart-5": `oklch(0.38 0.09 ${h})`,
  };
}

/** Compute the full CSS custom-property map for a config in a given mode. */
export function buildVars(config: ThemeConfig, mode: Mode): Record<string, string> {
  const baseMeta = BASE_COLORS[config.base];
  const steps = mode === "dark" ? DARK_STEPS : LIGHT_STEPS;
  const vars: Record<string, string> = {};

  for (const [token, value] of Object.entries(steps)) {
    vars[`--${token}`] = neutral(value, baseMeta.hue, baseMeta.chroma);
  }

  const accent = ACCENTS[config.accent];
  const primary = `oklch(${accent.l} ${accent.c} ${accent.h})`;
  vars["--primary"] = primary;
  vars["--primary-foreground"] = accent.fg;
  vars["--sidebar-primary"] = primary;
  vars["--sidebar-primary-foreground"] = accent.fg;
  vars["--ring"] = primary;
  vars["--sidebar-ring"] = primary;

  Object.assign(
    vars,
    Object.fromEntries(
      Object.entries(chartVars(CHART_COLORS[config.chart].h)).map(([k, v]) => [
        `--${k}`,
        v,
      ])
    )
  );

  vars["--radius"] = `${STYLES[config.style].radius}rem`;
  vars["--font-heading"] = FONTS[config.heading].varName;
  vars["--font-body"] = FONTS[config.body].varName;

  return vars;
}

/** Apply a config to the document (runtime, client-side). */
export function applyTheme(config: ThemeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = buildVars(config, config.mode);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.classList.toggle("dark", config.mode === "dark");
}

/** Generate a copy-pasteable CSS block (both light + dark) for "Get Code". */
export function buildCss(config: ThemeConfig): string {
  const format = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n");
  return `:root {\n${format(buildVars(config, "light"))}\n}\n\n.dark {\n${format(
    buildVars(config, "dark")
  )}\n}`;
}

const STYLE_KEYS = Object.keys(STYLES) as StyleKey[];
const BASE_KEYS = Object.keys(BASE_COLORS) as BaseKey[];
const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];
const CHART_KEYS = Object.keys(CHART_COLORS) as ChartKey[];

/**
 * Coerce arbitrary/legacy stored data into a fully valid config so unknown
 * keys (e.g. an older "serif" heading value) can never crash the UI.
 */
export function sanitizeConfig(
  input: Partial<ThemeConfig> | null | undefined
): ThemeConfig {
  const c = { ...DEFAULT_CONFIG, ...(input ?? {}) };
  const valid = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    typeof v === "string" && (allowed as readonly string[]).includes(v)
      ? (v as T)
      : fallback;
  return {
    style: valid(c.style, STYLE_KEYS, DEFAULT_CONFIG.style),
    base: valid(c.base, BASE_KEYS, DEFAULT_CONFIG.base),
    accent: valid(c.accent, ACCENT_KEYS, DEFAULT_CONFIG.accent),
    chart: valid(c.chart, CHART_KEYS, DEFAULT_CONFIG.chart),
    heading: valid(c.heading, HEADING_FONT_KEYS, DEFAULT_CONFIG.heading),
    body: valid(c.body, BODY_FONT_KEYS, DEFAULT_CONFIG.body),
    mode: c.mode === "light" || c.mode === "dark" ? c.mode : DEFAULT_CONFIG.mode,
  };
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Randomize everything except the light/dark mode. */
export function shuffleConfig(current: ThemeConfig): ThemeConfig {
  return {
    style: pick(STYLE_KEYS),
    base: pick(BASE_KEYS),
    accent: pick(ACCENT_KEYS),
    chart: pick(CHART_KEYS),
    heading: pick(HEADING_FONT_KEYS),
    body: pick(BODY_FONT_KEYS),
    mode: current.mode,
  };
}

/** Short, deterministic-ish label like the "--preset b8PQsMOSjD" chip. */
export function presetLabel(config: ThemeConfig): string {
  const seed = `${config.style}${config.base}${config.accent}${config.chart}${config.heading}${config.body}${config.mode}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let n = Math.abs(hash);
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + (i + 1) * 7;
  }
  return out;
}

export const STORAGE_KEY = "abd-theme-config";
