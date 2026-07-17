// Design tokens mirrored for inline-style use (the codebase styles inline).
// Keep in sync with src/design/global.css.

export const color = {
  bg0: "#08090b",
  bg1: "#0d0f13",
  bg2: "#14171d",
  bg3: "#1b1f27",
  bgGlass: "rgba(13,15,19,0.72)",

  line: "rgba(255,255,255,0.07)",
  line2: "rgba(255,255,255,0.11)",
  lineStrong: "rgba(255,255,255,0.18)",
  metal: "#8b929c",
  metalDim: "#565c66",

  text: "#f3f5f7",
  textDim: "rgba(243,245,247,0.60)",
  textFaint: "rgba(243,245,247,0.36)",
  textGhost: "rgba(243,245,247,0.16)",

  blue: "#3b82f6",
  blueBright: "#63a0ff",
  blueDim: "rgba(59,130,246,0.14)",
  orange: "#ff6a2c",
  orangeBright: "#ff8a52",
  orangeDim: "rgba(255,106,44,0.13)",
  green: "#12e29a",
  greenDim: "rgba(18,226,154,0.12)",
};

// semantic
export const accent = color.blue;
export const heat = color.orange;
export const go = color.green;

export const font = {
  display: '"Space Grotesk", "Inter", system-ui, sans-serif',
  body: '"Inter", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", monospace',
};

// back-compat aliases (old code imported `mono`, `display`, `accent`)
export const mono = font.mono;
export const display = font.display;

export const ease = {
  out: "cubic-bezier(0.16,1,0.3,1)",
  inOut: "cubic-bezier(0.65,0,0.35,1)",
  heavy: "cubic-bezier(0.7,0,0.2,1)",
};

export const dur = { fast: 0.16, base: 0.28, slow: 0.62 };

export const radius = { sm: "4px", base: "8px", lg: "14px" };

export const shadow = {
  panel: "0 20px 60px -24px rgba(0,0,0,0.8)",
  lift: "0 30px 80px -30px rgba(0,0,0,0.9)",
};

export const z = { nav: 100, overlay: 200, panel: 300 };

export const MAXW = 1120;
