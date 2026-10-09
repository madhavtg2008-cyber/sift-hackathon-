export type ThemeId = "midnight" | "paper" | "matcha" | "dusk" | "terminal" | "chai";
export type AccentId = "theme" | "lime" | "coral" | "sky" | "violet" | "saffron" | "rose";
export type TextSize = "s" | "m" | "l";
export type Headline = "serif" | "sans" | "mono";

export interface UiPrefs {
  theme: ThemeId;
  accent: AccentId;
  textSize: TextSize;
  headline: Headline;
  focusMode: boolean; // hide low-signal messages in chats by default
  showReasons: boolean; // show the "Why" line on cards
}

export const DEFAULT_PREFS: UiPrefs = {
  theme: "midnight",
  accent: "theme",
  textSize: "m",
  headline: "serif",
  focusMode: false,
  showReasons: false,
};

/** Swatches used only to preview themes in Settings: [background, panel, accent, ink] */
export const THEMES: { id: ThemeId; name: string; blurb: string; mode: "dark" | "light"; swatch: [string, string, string, string] }[] = [
  {
    id: "midnight",
    name: "Midnight",
    blurb: "Ink black, lime highlights",
    mode: "dark",
    swatch: ["#0b0d10", "#12151a", "#c8f169", "#e8eaee"],
  },
  {
    id: "paper",
    name: "Paper",
    blurb: "Warm newsprint, calm reading",
    mode: "light",
    swatch: ["#f4f0e8", "#fbf9f4", "#2f5d1e", "#1d1b17"],
  },
  { id: "chai", name: "Chai", blurb: "Masala brown & saffron", mode: "dark", swatch: ["#1a1410", "#231b15", "#ffa53d", "#f3e6d6"] },
  { id: "matcha", name: "Matcha", blurb: "Deep green, soft mint", mode: "dark", swatch: ["#0c1411", "#121d18", "#7fe0a8", "#e3efe8"] },
  { id: "dusk", name: "Dusk", blurb: "Plum night, coral glow", mode: "dark", swatch: ["#140f1a", "#1c1524", "#ff8a6b", "#efe6f4"] },
  {
    id: "terminal",
    name: "Terminal",
    blurb: "Monospace, phosphor green",
    mode: "dark",
    swatch: ["#000000", "#0a0d0a", "#3dff7a", "#c9f5d4"],
  },
];

export const ACCENTS: { id: AccentId; name: string; dark: string; light: string }[] = [
  { id: "lime", name: "Lime", dark: "#c8f169", light: "#3d6b12" },
  { id: "coral", name: "Coral", dark: "#ff8a6b", light: "#c2410c" },
  { id: "sky", name: "Sky", dark: "#6cc7ff", light: "#0b6aa8" },
  { id: "violet", name: "Violet", dark: "#b79cff", light: "#6236d6" },
  { id: "saffron", name: "Saffron", dark: "#ffb03d", light: "#b45309" },
  { id: "rose", name: "Rose", dark: "#ff7aa8", light: "#be185d" },
];

export const PREFS_KEY = "sift:ui";
const KEY = PREFS_KEY;

export function readPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function applyPrefs(p: UiPrefs) {
  const el = document.documentElement;
  const theme = THEMES.find((t) => t.id === p.theme) ?? THEMES[0];
  el.dataset.theme = theme.id;
  el.dataset.mode = theme.mode;
  el.dataset.size = p.textSize;
  el.dataset.headline = p.headline;
  const accent = ACCENTS.find((a) => a.id === p.accent);
  if (accent) {
    el.style.setProperty("--color-accent", theme.mode === "light" ? accent.light : accent.dark);
    el.style.setProperty("--color-accent-ink", theme.mode === "light" ? "#ffffff" : "#12160a");
  } else {
    el.style.removeProperty("--color-accent");
    el.style.removeProperty("--color-accent-ink");
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", theme.swatch[0]);
}

/** Runs before first paint (inlined in <head>) so the saved theme shows with no flash. */
export const PREFS_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem("${KEY}")||"{}");var T=${JSON.stringify(
  Object.fromEntries(THEMES.map((t) => [t.id, t.mode])),
)};var A=${JSON.stringify(Object.fromEntries(ACCENTS.map((a) => [a.id, [a.dark, a.light]])))};var t=T[p.theme]?p.theme:"midnight";var e=document.documentElement;e.dataset.theme=t;e.dataset.mode=T[t];e.dataset.size=p.textSize||"m";e.dataset.headline=p.headline||"serif";var a=A[p.accent];if(a){var l=T[t]==="light";e.style.setProperty("--color-accent",l?a[1]:a[0]);e.style.setProperty("--color-accent-ink",l?"#ffffff":"#12160a");}}catch(x){}})();`;
