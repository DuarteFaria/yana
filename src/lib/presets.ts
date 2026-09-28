import type { Character, Cover, Holding, Paper, PaperFont, PaperStyle } from "./types";

type Preset = { name: string; cover: Cover; paper: Paper };

// Each character comes with a cover palette and pages that match it.
export const PRESETS: Record<Character, Preset> = {
  capybara: {
    name: "Capybara",
    cover: { character: "capybara", fur: "#b98352", accent: "#8b5a34", fluff: 0.8, holding: "lemon", ribbon: "#f2c94c" },
    paper: { style: "margin", color: "#fbf1a9", line: "#8a8a6a", margin: "#6b6b4a", spacing: 30, font: "nunito", ink: "#2b2a22" },
  },
  cat: {
    name: "Cat",
    cover: { character: "cat", fur: "#4b4b52", accent: "#f6f2ee", fluff: 0.9, holding: "none", ribbon: "#8d8a86" },
    paper: { style: "ruled", color: "#ffffff", line: "#9ec3ea", margin: "#e89aa6", spacing: 30, font: "nunito", ink: "#23262d" },
  },
  bunny: {
    name: "Bunny",
    cover: { character: "bunny", fur: "#f6dfe6", accent: "#ffffff", fluff: 1, holding: "strawberry", ribbon: "#f48fb1" },
    paper: { style: "dots", color: "#fff5f7", line: "#e7a9bb", margin: "#e7a9bb", spacing: 28, font: "hand", ink: "#4a2b35" },
  },
  bear: {
    name: "Bear",
    cover: { character: "bear", fur: "#d6a46c", accent: "#f3dcb8", fluff: 0.7, holding: "heart", ribbon: "#e76f51" },
    paper: { style: "margin", color: "#fdf6ea", line: "#d9c2a0", margin: "#e76f51", spacing: 30, font: "serif", ink: "#3a2a1c" },
  },
  frog: {
    name: "Frog",
    cover: { character: "frog", fur: "#8fc27f", accent: "#e7f3c9", fluff: 0.6, holding: "flower", ribbon: "#f7b2bd" },
    paper: { style: "grid", color: "#f3f9ec", line: "#b9d8a8", margin: "#8fc27f", spacing: 28, font: "nunito", ink: "#22331d" },
  },
  panda: {
    name: "Panda",
    cover: { character: "panda", fur: "#f7f5f0", accent: "#2d2d33", fluff: 0.85, holding: "none", ribbon: "#6fcf97" },
    paper: { style: "grid", color: "#ffffff", line: "#dedede", margin: "#bdbdbd", spacing: 24, font: "mono", ink: "#1f1f24" },
  },
  chick: {
    name: "Chick",
    cover: { character: "chick", fur: "#ffd95e", accent: "#ffb347", fluff: 1, holding: "star", ribbon: "#7fb3ff" },
    paper: { style: "ruled", color: "#fffbe8", line: "#f0c96b", margin: "#f09a5b", spacing: 30, font: "hand", ink: "#3b2f12" },
  },
  plain: {
    name: "Plain fluff",
    cover: { character: "plain", fur: "#b7a6e0", accent: "#ffffff", fluff: 0.9, holding: "heart", ribbon: "#ffffff" },
    paper: { style: "blank", color: "#fbfaff", line: "#d8d0f0", margin: "#b7a6e0", spacing: 30, font: "nunito", ink: "#2a2438" },
  },
};

export const CHARACTERS = Object.keys(PRESETS) as Character[];

export const HOLDINGS: { key: Holding; label: string }[] = [
  { key: "none", label: "Nothing" },
  { key: "lemon", label: "Lemon" },
  { key: "heart", label: "Heart" },
  { key: "star", label: "Star" },
  { key: "strawberry", label: "Strawberry" },
  { key: "flower", label: "Flower" },
];

export const FUR_SWATCHES = [
  "#b98352", "#8b5a34", "#d6a46c", "#4b4b52", "#2d2d33", "#f7f5f0",
  "#f6dfe6", "#f4a7b9", "#ffd95e", "#ffb347", "#8fc27f", "#7fc8c2",
  "#9ec3ea", "#b7a6e0", "#e76f51",
];

export const PAPER_SWATCHES = [
  "#ffffff", "#fbf1a9", "#fffbe8", "#fdf6ea", "#fff5f7", "#f3f9ec",
  "#eef6ff", "#f4f0ff", "#e9dcc6", "#2a2a30",
];

export const LINE_SWATCHES = [
  "#9ec3ea", "#8a8a6a", "#d9c2a0", "#e7a9bb", "#b9d8a8", "#dedede",
  "#f0c96b", "#c7b8ef", "#4a4a55",
];

export const PAPER_STYLES: { key: PaperStyle; label: string }[] = [
  { key: "ruled", label: "Stripes" },
  { key: "margin", label: "Stripes + margin" },
  { key: "grid", label: "Grid" },
  { key: "dots", label: "Dots" },
  { key: "blank", label: "Blank" },
];

export const FONTS: { key: PaperFont; label: string; css: string }[] = [
  { key: "nunito", label: "Round", css: "'Nunito Variable', sans-serif" },
  { key: "hand", label: "Handwritten", css: "'Patrick Hand', cursive" },
  { key: "serif", label: "Bookish", css: "'Fraunces Variable', serif" },
  { key: "mono", label: "Typewriter", css: "'JetBrains Mono Variable', monospace" },
];

export function fontCss(font: PaperFont) {
  return FONTS.find((f) => f.key === font)?.css ?? FONTS[0].css;
}

const TITLES: Record<Character, string> = {
  capybara: "Diary",
  cat: "Work",
  bunny: "Ideas",
  bear: "Recipes",
  frog: "Plans",
  panda: "Study",
  chick: "Journal",
  plain: "Notes",
};

export function suggestedPreset(existing: Character[]): Character {
  const unused = CHARACTERS.filter((c) => !existing.includes(c));
  const pool = unused.length ? unused : CHARACTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function suggestedTitle(c: Character) {
  return TITLES[c];
}
