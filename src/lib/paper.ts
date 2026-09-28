import type { CSSProperties } from "react";
import { fontCss } from "./presets";
import type { Paper } from "./types";

export const PAGE_WIDTH = 820;
export const PAGE_MIN_HEIGHT = 1100;

export function paperMetrics(p: Paper, compact = false) {
  const s = p.spacing;
  const fontScale = p.font === "hand" ? 0.68 : p.font === "mono" ? 0.5 : 0.56;
  const fontSize = Math.round(s * fontScale);
  const top = s * (compact ? 2 : 3);
  const left = compact ? (p.style === "margin" ? 48 : 20) : p.style === "margin" ? 104 : 64;
  return { s, fontSize, top, left, right: compact ? 18 : 56 };
}

/** CSS custom properties + background for a sheet of this paper. */
export function paperStyle(p: Paper, compact = false): CSSProperties {
  const { s, fontSize, top, left, right } = paperMetrics(p, compact);
  const layers: string[] = [];
  const sizes: string[] = [];
  const positions: string[] = [];
  const repeats: string[] = [];
  const add = (img: string, size: string, pos: string, repeat = "repeat") => {
    layers.push(img);
    sizes.push(size);
    positions.push(pos);
    repeats.push(repeat);
  };

  // Blank band at the top, like the header of a real exercise book.
  if (p.style !== "blank") add(`linear-gradient(${p.color}, ${p.color})`, `100% ${top - 1}px`, "0 0", "no-repeat");

  if (p.style === "margin") {
    add(
      `linear-gradient(to right, transparent ${left - 22}px, ${p.margin} ${left - 22}px, ${p.margin} ${left - 20.5}px, transparent ${left - 20.5}px)`,
      "100% 100%",
      "0 0",
      "no-repeat",
    );
  }
  if (p.style === "ruled" || p.style === "margin") {
    add(`linear-gradient(to bottom, transparent ${s - 1}px, ${p.line} ${s - 1}px)`, `100% ${s}px`, `0 ${top}px`);
  }
  if (p.style === "grid") {
    add(`linear-gradient(to bottom, transparent ${s - 1}px, ${p.line} ${s - 1}px)`, `${s}px ${s}px`, `0 ${top}px`);
    add(`linear-gradient(to right, transparent ${s - 1}px, ${p.line} ${s - 1}px)`, `${s}px ${s}px`, `${left % s}px 0`);
  }
  if (p.style === "dots") {
    add(`radial-gradient(circle at 50% 100%, ${p.line} 1.4px, transparent 1.9px)`, `${s}px ${s}px`, `${(left % s) - s / 2}px ${top - 1}px`);
  }

  return {
    backgroundColor: p.color,
    backgroundImage: layers.join(", ") || "none",
    backgroundSize: sizes.join(", "),
    backgroundPosition: positions.join(", "),
    backgroundRepeat: repeats.join(", "),
    color: p.ink,
    ["--line" as string]: `${s}px`,
    ["--font-size" as string]: `${fontSize}px`,
    ["--pad-top" as string]: `${top}px`,
    ["--pad-left" as string]: `${left}px`,
    ["--pad-right" as string]: `${right}px`,
    ["--paper" as string]: p.color,
    ["--paper-line" as string]: p.line,
    ["--paper-margin" as string]: p.margin,
    ["--ink" as string]: p.ink,
    ["--page-font" as string]: fontCss(p.font),
  };
}
