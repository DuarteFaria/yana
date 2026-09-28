import type { Tool } from "../Overlay";

export type MathTarget = { kind: "inline" | "block"; latex: string; pos?: number };

/** Hooks the editor uses to reach UI owned by the notebook (pickers, modes). */
export const bridge = {
  pickImage: () => {},
  openMath: (_t: MathTarget) => {},
  openStickers: () => {},
  startDrawing: (_tool: Tool) => {},
};
