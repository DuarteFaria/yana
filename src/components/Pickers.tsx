import katex from "katex";
import { useMemo, useState } from "react";
import { saveFile } from "../lib/files";
import type { MathTarget } from "./editor/bridge";
import { Modal } from "./Modal";
import { EMOJI, STICKERS, StickerArt } from "./stickers";

const SNIPPETS = [
  ["x^2", "x²"],
  ["\\frac{a}{b}", "a/b"],
  ["\\sqrt{x}", "√"],
  ["\\sum_{i=1}^{n}", "Σ"],
  ["\\int_a^b", "∫"],
  ["\\lim_{x \\to \\infty}", "lim"],
  ["\\alpha", "α"],
  ["\\pi", "π"],
  ["\\Delta", "Δ"],
  ["\\cdot", "·"],
  ["\\leq", "≤"],
  ["\\rightarrow", "→"],
];

export function MathEditor({ target, onSave, onClose }: { target: MathTarget; onSave: (latex: string) => void; onClose: () => void }) {
  const [latex, setLatex] = useState(target.latex);
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex || "\\text{type a formula}", { throwOnError: false, displayMode: target.kind === "block" });
    } catch {
      return "";
    }
  }, [latex, target.kind]);

  return (
    <Modal title={target.kind === "block" ? "Formula block" : "Formula"} onClose={onClose}>
      <div className="math-preview" dangerouslySetInnerHTML={{ __html: html }} />
      <textarea
        className="math-input"
        value={latex}
        autoFocus
        spellCheck={false}
        placeholder="e.g. E = mc^2   or   \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
        onChange={(e) => setLatex(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSave(latex);
          }
        }}
      />
      <div className="chips">
        {SNIPPETS.map(([tex, label]) => (
          <button key={tex} className="chip" onClick={() => setLatex((l) => `${l}${l && !l.endsWith(" ") ? " " : ""}${tex}`)}>
            {label}
          </button>
        ))}
      </div>
      <div className="row between">
        <span className="muted small">LaTeX · Enter to save · Shift+Enter for a new line</span>
        <button className="btn primary" onClick={() => onSave(latex)}>
          {target.pos === undefined ? "Insert" : "Update"}
        </button>
      </div>
    </Modal>
  );
}

export function StickerPicker({ onPick, onClose }: { onPick: (k: string) => void; onClose: () => void }) {
  return (
    <Modal title="Stickers" onClose={onClose} wide>
      <div className="sticker-grid">
        {Object.entries(STICKERS).map(([k, s]) => (
          <button key={k} className="sticker-btn" title={s.label} onClick={() => onPick(k)}>
            <StickerArt k={k} size={64} />
          </button>
        ))}
      </div>
      <div className="sticker-grid emoji">
        {EMOJI.map((e) => (
          <button key={e} className="sticker-btn" onClick={() => onPick(`e:${e}`)}>
            <StickerArt k={`e:${e}`} size={44} />
          </button>
        ))}
      </div>
      <div className="row between">
        <span className="muted small">Tap a sticker, then tap the page to stick it.</span>
        <label className="btn small">
          Your own image…
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) onPick(`f:${await saveFile(f)}`);
            }}
          />
        </label>
      </div>
    </Modal>
  );
}
