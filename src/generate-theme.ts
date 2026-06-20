import {
  Blend,
  Hct,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities";
import fs from "fs";
import path from "path";
import readline from "readline";

// ─── Catppuccin palettes ─────────────────────────────────────────────────────

type Palette = Record<string, string>;

const CATPPUCCIN_LATTE: Palette = {
  rosewater: "#dc8a78",
  flamingo: "#dd7878",
  pink: "#ea76cb",
  mauve: "#8839ef",
  red: "#d20f39",
  maroon: "#e64553",
  peach: "#fe640b",
  yellow: "#df8e1d",
  green: "#40a02b",
  teal: "#179299",
  sky: "#04a5e5",
  sapphire: "#209fb5",
  blue: "#1e66f5",
  lavender: "#7287fd",
  text: "#4c4f69",
  subtext1: "#5c5f77",
  subtext0: "#6c6f85",
  overlay2: "#7c7f93",
  overlay1: "#8c8fa1",
  overlay0: "#9ca0b0",
  surface2: "#acb0be",
  surface1: "#bcc0cc",
  surface0: "#ccd0da",
  base: "#eff1f5",
  mantle: "#e6e9ef",
  crust: "#dce0e8",
};

const CATPPUCCIN_MOCHA: Palette = {
  rosewater: "#f5e0dc",
  flamingo: "#f2cdcd",
  pink: "#f5c2e7",
  mauve: "#cba6f7",
  red: "#f38ba8",
  maroon: "#eba0ac",
  peach: "#fab387",
  yellow: "#f9e2af",
  green: "#a6e3a1",
  teal: "#94e2d5",
  sky: "#89dceb",
  sapphire: "#74c7ec",
  blue: "#89b4fa",
  lavender: "#b4befe",
  text: "#cdd6f4",
  subtext1: "#bac2de",
  subtext0: "#a6adc8",
  overlay2: "#9399b2",
  overlay1: "#7f849c",
  overlay0: "#6c7086",
  surface2: "#585b70",
  surface1: "#45475a",
  surface0: "#313244",
  base: "#1e1e2e",
  mantle: "#181825",
  crust: "#11111b",
};

const ACCENT_KEYS = [
  "rosewater",
  "flamingo",
  "pink",
  "mauve",
  "red",
  "maroon",
  "peach",
  "yellow",
  "green",
  "teal",
  "sky",
  "sapphire",
  "blue",
  "lavender",
];

// ─── Color helpers ────────────────────────────────────────────────────────────

function hexToArgb(hex: string): number {
  return argbFromHex(hex);
}

function argbToHex(argb: number): string {
  return hexFromArgb(argb);
}

// Perceptual distance in HCT space (normalized components)
function hctDistance(hexA: string, hexB: string): number {
  const a = Hct.fromInt(hexToArgb(hexA));
  const b = Hct.fromInt(hexToArgb(hexB));
  const hueDiff = Math.min(
    Math.abs(a.hue - b.hue),
    360 - Math.abs(a.hue - b.hue),
  );
  const chromaDiff = Math.abs(a.chroma - b.chroma);
  const toneDiff = Math.abs(a.tone - b.tone);
  // Weight: hue most important for identity, then chroma, then tone
  return (
    (hueDiff / 180) * 0.6 + (chromaDiff / 120) * 0.25 + (toneDiff / 100) * 0.15
  );
}

// Find which accent token in the reference palette is perceptually closest to the seed
function findClosestAccent(
  sourceHex: string,
  referencePalette: Palette,
): { key: string; distance: number } {
  let best = { key: "", distance: Infinity };
  for (const key of ACCENT_KEYS) {
    const d = hctDistance(sourceHex, referencePalette[key]);
    if (d < best.distance) best = { key, distance: d };
  }
  return best;
}

// Harmonize accent color hue toward source
function harmonize(targetHex: string, sourceArgb: number): string {
  return argbToHex(Blend.harmonize(hexToArgb(targetHex), sourceArgb));
}

// Subtle hue tint for neutral/surface colors (≤5° shift)
function tintNeutral(
  targetHex: string,
  sourceHct: Hct,
  maxDegrees = 5,
): string {
  const tgt = Hct.fromInt(hexToArgb(targetHex));
  const diff = ((sourceHct.hue - tgt.hue + 540) % 360) - 180;
  const shift = Math.sign(diff) * Math.min(Math.abs(diff), maxDegrees);
  return argbToHex(
    Hct.from((tgt.hue + shift + 360) % 360, tgt.chroma, tgt.tone).toInt(),
  );
}

// Adapt source color for dark mode: keep source hue+chroma, match tone to the
// dark palette's convention for that slot
function adaptSourceForDark(sourceHex: string, darkSlotHex: string): string {
  const src = Hct.fromInt(hexToArgb(sourceHex));
  const dark = Hct.fromInt(hexToArgb(darkSlotHex));
  return argbToHex(Hct.from(src.hue, src.chroma, dark.tone).toInt());
}

// ─── Palette generation ───────────────────────────────────────────────────────

function generatePalette(
  base: Palette,
  sourceArgb: number,
  sourceHct: Hct,
  pinKey: string | null,
  pinLightHex: string,
  pinDarkHex: string | null,
  isLight: boolean,
): Palette {
  const result: Palette = {};
  for (const [key, hex] of Object.entries(base)) {
    if (pinKey && key === pinKey) {
      result[key] = isLight ? pinLightHex : (pinDarkHex ?? hex);
    } else if (ACCENT_KEYS.includes(key)) {
      result[key] = harmonize(hex, sourceArgb);
    } else {
      result[key] = tintNeutral(hex, sourceHct);
    }
  }
  return result;
}

// ─── Semantic tokens ──────────────────────────────────────────────────────────

function buildSemanticTokens(palette: Palette, closestKey: string): Palette {
  return {
    "bg-base": palette.base,
    "bg-crust": palette.crust,
    "bg-mantle": palette.mantle,
    "bg-surface0": palette.surface0,
    "bg-surface1": palette.surface1,
    "bg-surface2": palette.surface2,
    "bg-overlay0": palette.overlay0,
    "bg-overlay1": palette.overlay1,
    "bg-overlay2": palette.overlay2,
    "text-body": palette.text,
    "text-headline": palette.text,
    "text-subtext": palette.subtext1,
    "text-label": palette.subtext0,
    "text-subtle": palette.overlay1,
    "text-on-accent": palette.base,
    "color-link": palette.blue,
    "color-success": palette.green,
    "color-warning": palette.yellow,
    "color-error": palette.red,
    "color-accent": palette[closestKey],
    "color-accent-secondary": palette.lavender,
    "color-cursor": palette.rosewater,
    "color-selection-bg": palette.overlay2,
    "color-tag": palette.blue,
    "accent-rosewater": palette.rosewater,
    "accent-flamingo": palette.flamingo,
    "accent-pink": palette.pink,
    "accent-mauve": palette.mauve,
    "accent-red": palette.red,
    "accent-maroon": palette.maroon,
    "accent-peach": palette.peach,
    "accent-yellow": palette.yellow,
    "accent-green": palette.green,
    "accent-teal": palette.teal,
    "accent-sky": palette.sky,
    "accent-sapphire": palette.sapphire,
    "accent-blue": palette.blue,
    "accent-lavender": palette.lavender,
    "syntax-keyword": palette.mauve,
    "syntax-string": palette.green,
    "syntax-symbol": palette.red,
    "syntax-regex": palette.pink,
    "syntax-comment": palette.overlay2,
    "syntax-constant": palette.peach,
    "syntax-operator": palette.sky,
    "syntax-delimiter": palette.overlay2,
    "syntax-function": palette.blue,
    "syntax-parameter": palette.maroon,
    "syntax-builtin": palette.red,
    "syntax-type": palette.yellow,
    "syntax-enum-variant": palette.teal,
    "syntax-property": palette.blue,
    "syntax-attribute": palette.yellow,
    "syntax-macro": palette.rosewater,
  };
}

// ─── Output builders ──────────────────────────────────────────────────────────

function paletteToCssVars(palette: Palette, indent: string): string {
  return Object.entries(palette)
    .map(([k, v]) => `${indent}--ctp-${k}: ${v};`)
    .join("\n");
}

function tokensToCssVars(tokens: Palette, indent: string): string {
  return Object.entries(tokens)
    .map(([k, v]) => `${indent}--${k}: ${v};`)
    .join("\n");
}

function buildCss(
  name: string,
  sourceHex: string,
  lightPalette: Palette,
  darkPalette: Palette,
  lightTokens: Palette,
  darkTokens: Palette,
): string {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const lightName = `${name} Latte`;
  const darkName = `${name} Mocha`;
  return `/**
 * ${name} — Custom Catppuccin Theme
 * Source color: ${sourceHex}
 * Light: ${lightName} (based on Catppuccin Latte)
 * Dark:  ${darkName} (based on Catppuccin Mocha)
 * Harmonized with Material Color Utilities Blend.harmonize()
 */

/* ── Light (${lightName}) ─────────────────────────────────────────────── */
:root,
[data-theme="${slug}-latte"],
[data-theme="light"] {
${paletteToCssVars(lightPalette, "  ")}

${tokensToCssVars(lightTokens, "  ")}
}

/* ── Dark (${darkName}) ─────────────────────────────────────────────── */
@media (prefers-color-scheme: dark) {
  :root {
${paletteToCssVars(darkPalette, "    ")}
${tokensToCssVars(darkTokens, "    ")}
  }
}

[data-theme="${slug}-mocha"],
[data-theme="dark"] {
${paletteToCssVars(darkPalette, "  ")}
${tokensToCssVars(darkTokens, "  ")}
}
`;
}

interface ThemeJson {
  meta: {
    name: string;
    lightTheme: string;
    darkTheme: string;
    sourceColor: string;
    closestCatppuccinToken: string;
    sourceColorPinned: boolean;
    generatedFrom: string[];
    harmonization: string;
    cssDataAttributes: { light: string; dark: string };
  };
  light: { palette: Palette; tokens: Palette };
  dark: { palette: Palette; tokens: Palette };
}

function buildJson(
  name: string,
  sourceHex: string,
  closestKey: string,
  pinSource: boolean,
  lightPalette: Palette,
  darkPalette: Palette,
  lightTokens: Palette,
  darkTokens: Palette,
): ThemeJson {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return {
    meta: {
      name,
      lightTheme: `${name} Latte`,
      darkTheme: `${name} Mocha`,
      sourceColor: sourceHex,
      closestCatppuccinToken: closestKey,
      sourceColorPinned: pinSource,
      generatedFrom: ["catppuccin-latte", "catppuccin-mocha"],
      harmonization: "material-blend-harmonize",
      cssDataAttributes: {
        light: `data-theme="${slug}-latte"`,
        dark: `data-theme="${slug}-mocha"`,
      },
    },
    light: { palette: lightPalette, tokens: lightTokens },
    dark: { palette: darkPalette, tokens: darkTokens },
  };
}

// ─── CLI / interactive prompt helpers ─────────────────────────────────────────

interface CliArgs {
  name: string | null;
  source: string | null;
  pin: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { name: null, source: null, pin: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) result.name = args[++i];
    if (args[i] === "--source" && args[i + 1]) result.source = args[++i];
    if (args[i] === "--pin-source") result.pin = true;
  }
  return result;
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function isValidHex(s: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(s.trim());
}

function normalizeHex(s: string): string {
  s = s.trim();
  return s.startsWith("#") ? s.toLowerCase() : `#${s.toLowerCase()}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cliArgs = parseArgs();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // ── Theme name
  let name = cliArgs.name;
  if (!name) {
    name =
      (await prompt(rl, '\nTheme name (e.g. "Resonance"): ')).trim() ||
      "Custom";
  }

  // ── Source color
  let sourceHex = cliArgs.source;
  while (!sourceHex || !isValidHex(sourceHex)) {
    sourceHex = await prompt(rl, "Seed color hex (e.g. #5E81AC): ");
  }
  sourceHex = normalizeHex(sourceHex);

  // ── Closest token detection
  const sourceArgb = hexToArgb(sourceHex);
  const sourceHct = Hct.fromInt(sourceArgb);
  const { key: closestKey, distance: closestDist } = findClosestAccent(
    sourceHex,
    CATPPUCCIN_LATTE,
  );

  const closestLatte = CATPPUCCIN_LATTE[closestKey];
  const closestMocha = CATPPUCCIN_MOCHA[closestKey];
  const closestHct = Hct.fromInt(hexToArgb(closestLatte));

  console.log(`\nSeed color: ${sourceHex}`);
  console.log(
    `  HCT — Hue: ${sourceHct.hue.toFixed(1)}°  Chroma: ${sourceHct.chroma.toFixed(1)}  Tone: ${sourceHct.tone.toFixed(1)}`,
  );
  console.log(
    `\nClosest Catppuccin token: \x1b[1m${closestKey}\x1b[0m  (HCT distance: ${(closestDist * 100).toFixed(1)})`,
  );
  console.log(
    `  Latte ${closestKey}: ${closestLatte}  (hue ${closestHct.hue.toFixed(1)}°)`,
  );
  console.log(`  Mocha ${closestKey}: ${closestMocha}`);

  // ── Pin source option
  let pinSource = cliArgs.pin;
  if (!cliArgs.pin) {
    const ans = await prompt(
      rl,
      `\nPin your seed color to the "${closestKey}" slot? [y/N] `,
    );
    pinSource = ans.trim().toLowerCase() === "y";
  }

  rl.close();

  // When pinning: light theme uses exact source hex, dark theme adapts tone
  const pinLightHex = sourceHex;
  const pinDarkHex = pinSource
    ? adaptSourceForDark(sourceHex, closestMocha)
    : null;

  if (pinSource) {
    console.log(`\nPinning source color to "${closestKey}":`);
    console.log(`  Light (Latte): ${pinLightHex}  (exact seed)`);
    console.log(
      `  Dark  (Mocha): ${pinDarkHex}  (seed hue+chroma, Mocha tone)`,
    );
  }

  // ── Generate palettes
  const lightPalette = generatePalette(
    CATPPUCCIN_LATTE,
    sourceArgb,
    sourceHct,
    pinSource ? closestKey : null,
    pinLightHex,
    pinDarkHex,
    true,
  );
  const darkPalette = generatePalette(
    CATPPUCCIN_MOCHA,
    sourceArgb,
    sourceHct,
    pinSource ? closestKey : null,
    pinLightHex,
    pinDarkHex,
    false,
  );

  const lightTokens = buildSemanticTokens(lightPalette, closestKey);
  const darkTokens = buildSemanticTokens(darkPalette, closestKey);

  // ── Print hue shift summary
  console.log("\nAccent hue shifts — Latte:");
  for (const key of ACCENT_KEYS) {
    const orig = Hct.fromInt(hexToArgb(CATPPUCCIN_LATTE[key]));
    const harm = Hct.fromInt(hexToArgb(lightPalette[key]));
    const diff = ((harm.hue - orig.hue + 540) % 360) - 180;
    const pinMark =
      pinSource && key === closestKey ? " \x1b[33m← pinned\x1b[0m" : "";
    console.log(
      `  ${key.padEnd(12)} ${CATPPUCCIN_LATTE[key]} → ${lightPalette[key]}  (Δhue ${diff > 0 ? "+" : ""}${diff.toFixed(1)}°)${pinMark}`,
    );
  }

  // ── Write output
  const outDir = path.resolve("./dist");
  fs.mkdirSync(outDir, { recursive: true });

  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const css = buildCss(
    name,
    sourceHex,
    lightPalette,
    darkPalette,
    lightTokens,
    darkTokens,
  );
  const json = buildJson(
    name,
    sourceHex,
    closestKey,
    pinSource,
    lightPalette,
    darkPalette,
    lightTokens,
    darkTokens,
  );

  fs.writeFileSync(path.join(outDir, `${slug}.css`), css);
  fs.writeFileSync(
    path.join(outDir, `${slug}.json`),
    JSON.stringify(json, null, 2),
  );

  console.log(`\nOutput written to:`);
  console.log(`  dist/${slug}.css`);
  console.log(`  dist/${slug}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
