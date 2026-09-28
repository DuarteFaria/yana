import { useEditorState, type Editor } from "@tiptap/react";
import { useState } from "react";
import type { Tool } from "./Overlay";
import { Segmented } from "./Segmented";

export type Mode = "write" | "draw";

export const INKS = ["#2b2224", "#e76f51", "#ff7b93", "#f2b632", "#5fb56a", "#4a90d9", "#8e6fd8"];
const HIGHLIGHTS = ["#fff3a6", "#ffd6e0", "#d4f5e6", "#dcebff", "#eadcff"];
const SIZES = [2, 4, 8];

type Props = {
  editor: Editor | null;
  mode: Mode;
  setMode: (m: Mode) => void;
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  size: number;
  setSize: (s: number) => void;
  fill: boolean;
  setFill: (f: boolean) => void;
  onImage: () => void;
  onSticker: () => void;
  onMath: () => void;
};

export function Toolbar(p: Props) {
  return (
    <div className="toolbar" onMouseDown={(e) => e.target instanceof HTMLButtonElement && e.preventDefault()}>
      <Segmented
        className="mode-toggle"
        value={p.mode}
        onChange={p.setMode}
        options={[
          { key: "write", label: <>✍︎ <span>Write</span></>, title: "Write (⌘E)" },
          { key: "draw", label: <>✎ <span>Draw</span></>, title: "Draw (⌘E)" },
        ]}
      />
      <div className="toolbar-scroll" key={p.mode}>
        {p.mode === "write" ? <WriteTools {...p} /> : <DrawTools {...p} />}
      </div>
    </div>
  );
}

function WriteTools({ editor, onImage, onSticker, onMath }: Props) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            block: e.isActive("heading", { level: 1 }) ? "h1" : e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : "p",
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            highlight: e.isActive("highlight"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            task: e.isActive("taskList"),
            table: e.isActive("table"),
            color: (e.getAttributes("textStyle").color as string | undefined) ?? null,
          }
        : null,
  });
  const [pop, setPop] = useState<"hl" | "color" | null>(null);
  if (!editor || !s) return null;
  const c = () => editor.chain().focus();

  return (
    <>
      <select
        className="tb-select"
        value={s.block}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") c().setParagraph().run();
          else c().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
        }}
      >
        <option value="p">Text</option>
        <option value="h1">Heading</option>
        <option value="h2">Subheading</option>
        <option value="h3">Small heading</option>
      </select>
      <span className="tb-sep" />
      <Btn on={s.bold} onClick={() => c().toggleBold().run()} title="Bold (⌘B)"><b>B</b></Btn>
      <Btn on={s.italic} onClick={() => c().toggleItalic().run()} title="Italic (⌘I)"><i>I</i></Btn>
      <Btn on={s.underline} onClick={() => c().toggleUnderline().run()} title="Underline (⌘U)"><u>U</u></Btn>
      <Btn on={s.strike} onClick={() => c().toggleStrike().run()} title="Strikethrough"><s>S</s></Btn>
      <span className="tb-pop-wrap">
        <Btn on={s.highlight} onClick={() => setPop(pop === "hl" ? null : "hl")} title="Highlighter">
          <span className="tb-hl">A</span>
        </Btn>
        {pop === "hl" && (
          <div className="tb-pop">
            {HIGHLIGHTS.map((h) => (
              <button key={h} className="dot" style={{ background: h }} onClick={() => (c().toggleHighlight({ color: h }).run(), setPop(null))} />
            ))}
            <button className="dot none" onClick={() => (c().unsetHighlight().run(), setPop(null))} title="No highlight" />
          </div>
        )}
      </span>
      <span className="tb-pop-wrap">
        <Btn onClick={() => setPop(pop === "color" ? null : "color")} title="Text colour">
          <span className="tb-color" style={{ borderColor: s.color ?? "currentColor" }}>A</span>
        </Btn>
        {pop === "color" && (
          <div className="tb-pop">
            {INKS.map((h) => (
              <button key={h} className="dot" style={{ background: h }} onClick={() => (c().setColor(h).run(), setPop(null))} />
            ))}
            <button className="dot none" onClick={() => (c().unsetColor().run(), setPop(null))} title="Default ink" />
          </div>
        )}
      </span>
      <span className="tb-sep" />
      <Btn on={s.bullet} onClick={() => c().toggleBulletList().run()} title="Bullets">•≡</Btn>
      <Btn on={s.ordered} onClick={() => c().toggleOrderedList().run()} title="Numbers">1≡</Btn>
      <Btn on={s.task} onClick={() => c().toggleTaskList().run()} title="Checklist">☑</Btn>
      <span className="tb-sep" />
      <Btn onClick={onImage} title="Image">🖼</Btn>
      <Btn onClick={onSticker} title="Sticker">🍓</Btn>
      <Btn onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Table">▦</Btn>
      <Btn onClick={onMath} title="Formula">∑</Btn>
      {s.table && (
        <>
          <span className="tb-sep" />
          <Btn onClick={() => c().addRowAfter().run()} title="Add row">+row</Btn>
          <Btn onClick={() => c().addColumnAfter().run()} title="Add column">+col</Btn>
          <Btn onClick={() => c().deleteRow().run()} title="Delete row">−row</Btn>
          <Btn onClick={() => c().deleteColumn().run()} title="Delete column">−col</Btn>
          <Btn onClick={() => c().toggleHeaderRow().run()} title="Header row">hdr</Btn>
          <Btn onClick={() => c().deleteTable().run()} title="Delete table">✕</Btn>
        </>
      )}
    </>
  );
}

const TOOLS: { key: Tool; icon: string; label: string }[] = [
  { key: "select", icon: "➚", label: "Select & move (V)" },
  { key: "pen", icon: "✎", label: "Pen (P)" },
  { key: "highlighter", icon: "▰", label: "Highlighter (H)" },
  { key: "eraser", icon: "⌫", label: "Eraser (E)" },
  { key: "line", icon: "╱", label: "Line (L)" },
  { key: "arrow", icon: "↗", label: "Arrow (A)" },
  { key: "rect", icon: "▢", label: "Box (R)" },
  { key: "ellipse", icon: "◯", label: "Circle (O)" },
  { key: "note", icon: "🗒", label: "Sticky note (T)" },
];

export const TOOL_KEYS: Record<string, Tool> = { v: "select", p: "pen", h: "highlighter", e: "eraser", l: "line", a: "arrow", r: "rect", o: "ellipse", t: "note" };

function DrawTools({ tool, setTool, color, setColor, size, setSize, fill, setFill, onSticker }: Props) {
  return (
    <>
      {TOOLS.map((t) => (
        <Btn key={t.key} on={tool === t.key} onClick={() => setTool(t.key)} title={t.label}>
          {t.icon}
        </Btn>
      ))}
      <Btn onClick={onSticker} title="Sticker">🍓</Btn>
      <span className="tb-sep" />
      {INKS.map((h) => (
        <button key={h} className={`dot ${color === h ? "on" : ""}`} style={{ background: h }} onClick={() => setColor(h)} aria-label={h} />
      ))}
      <span className="tb-sep" />
      {SIZES.map((sz) => (
        <button key={sz} className={`size ${size === sz ? "on" : ""}`} onClick={() => setSize(sz)} aria-label={`Size ${sz}`}>
          <span style={{ width: sz + 3, height: sz + 3 }} />
        </button>
      ))}
      {(tool === "rect" || tool === "ellipse") && (
        <Btn on={fill} onClick={() => setFill(!fill)} title="Fill shapes">◼︎</Btn>
      )}
    </>
  );
}

function Btn({ on, onClick, title, children }: { on?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button className={`tb ${on ? "on" : ""}`} onClick={onClick} title={title} aria-label={title} aria-pressed={on}>
      {children}
    </button>
  );
}
