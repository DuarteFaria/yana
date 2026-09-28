import { getStroke } from "perfect-freehand";
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { newId } from "../lib/ids";
import { PAGE_WIDTH } from "../lib/paper";
import type { OverlayItem } from "../lib/types";
import { StickerArt } from "./stickers";

export type Tool = "select" | "pen" | "highlighter" | "eraser" | "line" | "arrow" | "rect" | "ellipse" | "note";

type Props = {
  items: OverlayItem[];
  onChange: (items: OverlayItem[]) => void;
  active: boolean;
  tool: Tool;
  color: string;
  size: number;
  fill: boolean;
  pendingSticker: string | null;
  onPlaced: () => void;
  scale: number;
  height: number;
};

type Pt = { x: number; y: number };
type Drag =
  | { kind: "draw"; item: OverlayItem }
  | { kind: "move"; start: Pt; orig: OverlayItem }
  | { kind: "handle"; handle: string; orig: OverlayItem; start: Pt }
  | { kind: "erase" };

const NOTE_COLORS = ["#fff3a6", "#ffd6e0", "#d4f5e6", "#dcebff", "transparent"];

export function Overlay(p: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLiveState] = useState<OverlayItem[] | null>(null);
  // Mirror of `live` for pointer handlers, which can fire before a re-render.
  const liveRef = useRef<OverlayItem[] | null>(null);
  const setLive = (v: OverlayItem[] | null) => {
    liveRef.current = v;
    setLiveState(v);
  };
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const undo = useRef<OverlayItem[][]>([]);
  const redo = useRef<OverlayItem[][]>([]);
  const noteEls = useRef(new Map<string, HTMLElement>());
  const penSeen = useRef(false);
  const items = live ?? p.items;

  // Items added during this session get a little pop when they appear.
  const fresh = useRef(new Set<string>());
  const commit = useCallback(
    (next: OverlayItem[]) => {
      const before = new Set(p.items.map((i) => i.id));
      for (const it of next) if (!before.has(it.id)) fresh.current.add(it.id);
      undo.current.push(p.items);
      if (undo.current.length > 100) undo.current.shift();
      redo.current = [];
      setLive(null);
      p.onChange(next);
    },
    [p],
  );

  useEffect(() => {
    if (!p.active) {
      setSelected(null);
      setEditing(null);
    }
  }, [p.active]);

  const toLocal = (e: { clientX: number; clientY: number }): Pt => {
    const r = ref.current!.getBoundingClientRect();
    const k = r.width / PAGE_WIDTH;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };

  const noteHeight = (id: string) => (noteEls.current.get(id)?.offsetHeight ?? 60) ;

  // ---------- keyboard ----------
  useEffect(() => {
    if (!p.active) return;
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      const t = e.target as HTMLElement;
      if (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        const from = e.shiftKey ? redo.current : undo.current;
        const to = e.shiftKey ? undo.current : redo.current;
        const prev = from.pop();
        if (prev) {
          to.push(p.items);
          p.onChange(prev);
        }
        return;
      }
      if (!selected) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        commit(p.items.filter((i) => i.id !== selected));
        setSelected(null);
      } else if (e.key === "Escape") {
        setSelected(null);
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const it = p.items.find((i) => i.id === selected);
        if (it) {
          const copy = { ...translate(it, 24, 24), id: newId() };
          commit([...p.items, copy]);
          setSelected(copy.id);
        }
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 2;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
        const dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        commit(p.items.map((i) => (i.id === selected ? translate(i, dx, dy) : i)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.active, p.items, selected, editing, commit, p]);

  // ---------- pointer ----------
  const onDown = (e: React.PointerEvent) => {
    if (!p.active || editing) return;
    if (e.pointerType === "pen") penSeen.current = true;
    else if (e.pointerType === "touch" && penSeen.current) return; // palm rejection
    if ((e.target as HTMLElement).closest(".ov-toolbar")) return;
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    const pt = toLocal(e);
    const pressure = e.pointerType === "pen" ? e.pressure : 0.5;

    if (p.pendingSticker) {
      const it: OverlayItem = { id: newId(), t: "sticker", x: pt.x, y: pt.y, s: 96, r: Math.round(Math.random() * 16 - 8), k: p.pendingSticker };
      commit([...p.items, it]);
      setSelected(it.id);
      p.onPlaced();
      return;
    }

    const handle = (e.target as HTMLElement).dataset.handle;
    if (handle && selected) {
      const orig = p.items.find((i) => i.id === selected);
      if (orig) drag.current = { kind: "handle", handle, orig, start: pt };
      return;
    }

    switch (p.tool) {
      case "select": {
        const hitItem = topHit(p.items, pt, 8, noteHeight);
        setSelected(hitItem?.id ?? null);
        if (hitItem) drag.current = { kind: "move", start: pt, orig: hitItem };
        return;
      }
      case "eraser":
        drag.current = { kind: "erase" };
        erase(pt);
        return;
      case "pen":
      case "highlighter":
        drag.current = {
          kind: "draw",
          item: { id: newId(), t: "pen", pts: [r1(pt.x), r1(pt.y), r2(pressure)], color: p.color, size: p.tool === "highlighter" ? p.size * 4 + 8 : p.size, hl: p.tool === "highlighter" || undefined },
        };
        break;
      case "note": {
        const it: OverlayItem = { id: newId(), t: "note", x: pt.x, y: pt.y - 16, w: 200, text: "", color: NOTE_COLORS[0], r: Math.round(Math.random() * 6 - 3) };
        commit([...p.items, it]);
        setSelected(it.id);
        setEditing(it.id);
        return;
      }
      default:
        drag.current = {
          kind: "draw",
          item: { id: newId(), t: p.tool, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y, color: p.color, size: p.size, fill: p.fill && (p.tool === "rect" || p.tool === "ellipse") ? p.color : undefined },
        };
    }
    setLive([...p.items, (drag.current as { item: OverlayItem }).item]);
  };

  const erase = (pt: Pt) => {
    const cur = liveRef.current ?? p.items;
    const next = cur.filter((i) => !hit(i, pt, 10, noteHeight));
    if (next.length !== cur.length) setLive(next);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const pt = toLocal(e);
    if (d.kind === "erase") return erase(pt);
    if (d.kind === "draw") {
      const it = d.item;
      if (it.t === "pen") {
        const events = (e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]) as PointerEvent[];
        const pts = [...it.pts];
        for (const ev of events.length ? events : [e.nativeEvent]) {
          const q = toLocal(ev);
          pts.push(r1(q.x), r1(q.y), r2(e.pointerType === "pen" ? ev.pressure : 0.5));
        }
        d.item = { ...it, pts };
      } else if (it.t !== "sticker" && it.t !== "note") {
        let { x, y } = pt;
        if (e.shiftKey && (it.t === "line" || it.t === "arrow")) {
          // snap to 45°
          const a = Math.round(Math.atan2(y - it.y1, x - it.x1) / (Math.PI / 4)) * (Math.PI / 4);
          const len = Math.hypot(x - it.x1, y - it.y1);
          x = it.x1 + Math.cos(a) * len;
          y = it.y1 + Math.sin(a) * len;
        } else if (e.shiftKey) {
          const s = Math.max(Math.abs(x - it.x1), Math.abs(y - it.y1));
          x = it.x1 + Math.sign(x - it.x1) * s;
          y = it.y1 + Math.sign(y - it.y1) * s;
        }
        d.item = { ...it, x2: x, y2: y };
      }
      setLive([...p.items, d.item]);
    } else if (d.kind === "move") {
      const moved = translate(d.orig, pt.x - d.start.x, pt.y - d.start.y);
      setLive(p.items.map((i) => (i.id === moved.id ? moved : i)));
    } else if (d.kind === "handle") {
      const next = applyHandle(d.orig, d.handle, pt, d.start);
      setLive(p.items.map((i) => (i.id === next.id ? next : i)));
    }
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.kind === "draw") {
      const it = d.item;
      const tiny = it.t !== "pen" && it.t !== "sticker" && it.t !== "note" && Math.hypot(it.x2 - it.x1, it.y2 - it.y1) < 4;
      if (tiny) return setLive(null);
      commit([...p.items, it]);
    } else if (liveRef.current) {
      commit(liveRef.current);
    }
  };

  const updateItem = (id: string, patch: Partial<OverlayItem>) =>
    commit(p.items.map((i) => (i.id === id ? ({ ...i, ...patch } as OverlayItem) : i)));

  const sel = items.find((i) => i.id === selected);
  const cursor = p.pendingSticker ? "copy" : p.tool === "select" ? "default" : p.tool === "eraser" ? "cell" : "crosshair";

  return (
    <div
      ref={ref}
      className={`overlay ${p.active ? "active" : ""}`}
      style={{ width: PAGE_WIDTH, height: p.height, transform: `scale(${p.scale})`, cursor } as CSSProperties}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onDoubleClick={(e) => {
        if (!p.active) return;
        const h = topHit(p.items, toLocal(e), 6, noteHeight);
        if (h?.t === "note") {
          setSelected(h.id);
          setEditing(h.id);
        }
      }}
    >
      <svg className="ov-svg" width={PAGE_WIDTH} height={p.height}>
        {items.map((it) => (it.t === "sticker" || it.t === "note" ? null : <Vector key={it.id} it={it} />))}
      </svg>
      {items.map((it) =>
        it.t === "sticker" ? (
          <div key={it.id} className={`ov-sticker ${fresh.current.has(it.id) ? "ov-pop" : ""}`} style={{ left: it.x - it.s / 2, top: it.y - it.s / 2, width: it.s, height: it.s, transform: `rotate(${it.r}deg)` }}>
            <StickerArt k={it.k} size={it.s} />
          </div>
        ) : it.t === "note" ? (
          <div
            key={it.id}
            ref={(el) => {
              if (el) noteEls.current.set(it.id, el);
              else noteEls.current.delete(it.id);
            }}
            className={`ov-note ${it.color === "transparent" ? "bare" : ""} ${fresh.current.has(it.id) ? "ov-pop" : ""}`}
            style={{ left: it.x, top: it.y, width: it.w, background: it.color, transform: `rotate(${it.r}deg)`, color: it.color === "transparent" ? p.color : undefined }}
          >
            {editing === it.id ? (
              <textarea
                autoFocus
                defaultValue={it.text}
                placeholder="write…"
                onPointerDown={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  setEditing(null);
                  const text = e.target.value;
                  if (!text.trim()) commit(p.items.filter((i) => i.id !== it.id));
                  else if (text !== it.text) updateItem(it.id, { text });
                }}
                onKeyDown={(e) => e.key === "Escape" && (e.target as HTMLTextAreaElement).blur()}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = `${t.scrollHeight}px`;
                }}
              />
            ) : (
              <div className="ov-note-text">{it.text}</div>
            )}
          </div>
        ) : null,
      )}

      {p.active && sel && !drag.current && <Selection it={sel} noteHeight={noteHeight} />}
      {p.active && sel && editing !== sel.id && (
        <SelectionBar
          it={sel}
          noteHeight={noteHeight}
          onDelete={() => {
            commit(p.items.filter((i) => i.id !== sel.id));
            setSelected(null);
          }}
          onFront={() => commit([...p.items.filter((i) => i.id !== sel.id), sel])}
          onColor={sel.t === "note" ? (c) => updateItem(sel.id, { color: c }) : undefined}
        />
      )}
    </div>
  );
}

// ---------- rendering ----------

type PenItem = Extract<OverlayItem, { t: "pen" }>;
// Items are replaced on edits. Weak keys reuse paths across page visits without
// retaining drawings after their page/history is no longer referenced.
const penPaths = new WeakMap<PenItem, string>();

function penPath(it: PenItem) {
  const cached = penPaths.get(it);
  if (cached !== undefined) return cached;
  const pts: [number, number, number][] = [];
  for (let i = 0; i < it.pts.length; i += 3) pts.push([it.pts[i], it.pts[i + 1], it.pts[i + 2]]);
  const outline = getStroke(pts, {
    size: it.size,
    thinning: it.hl ? 0 : 0.55,
    smoothing: 0.6,
    streamline: 0.45,
    simulatePressure: !pts.some((q) => q[2] !== 0.5),
    last: true,
  });
  const path = svgPath(outline);
  penPaths.set(it, path);
  return path;
}

const Vector = memo(function Vector({ it }: { it: Exclude<OverlayItem, { t: "sticker" | "note" }> }) {
  if (it.t === "pen") {
    return <path d={penPath(it)} fill={it.color} opacity={it.hl ? 0.35 : 1} style={it.hl ? { mixBlendMode: "multiply" } : undefined} />;
  }
  const common = { stroke: it.color, strokeWidth: it.size, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (it.t === "line") return <line x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2} {...common} />;
  if (it.t === "arrow") {
    const a = Math.atan2(it.y2 - it.y1, it.x2 - it.x1);
    const len = 12 + it.size * 2.5;
    const h1 = [it.x2 - len * Math.cos(a - 0.5), it.y2 - len * Math.sin(a - 0.5)];
    const h2 = [it.x2 - len * Math.cos(a + 0.5), it.y2 - len * Math.sin(a + 0.5)];
    return (
      <path d={`M${it.x1} ${it.y1} L${it.x2} ${it.y2} M${h1[0]} ${h1[1]} L${it.x2} ${it.y2} L${h2[0]} ${h2[1]}`} fill="none" {...common} />
    );
  }
  const x = Math.min(it.x1, it.x2), y = Math.min(it.y1, it.y2);
  const w = Math.abs(it.x2 - it.x1), h = Math.abs(it.y2 - it.y1);
  const fill = it.fill ?? "none";
  if (it.t === "rect") return <rect x={x} y={y} width={w} height={h} rx={Math.min(10, w / 4, h / 4)} fill={fill} fillOpacity={0.35} {...common} />;
  return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={fill} fillOpacity={0.35} {...common} />;
});

function Selection({ it, noteHeight }: { it: OverlayItem; noteHeight: (id: string) => number }) {
  const b = bbox(it, noteHeight);
  const pad = 8;
  const style: CSSProperties = { left: b.x - pad, top: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2 };
  if (it.t === "sticker") style.transform = `rotate(${it.r}deg)`;
  return (
    <div className="ov-selection" style={style}>
      {(it.t === "line" || it.t === "arrow") && (
        <>
          <span data-handle="p1" className="ov-handle" style={{ left: it.x1 - b.x + pad, top: it.y1 - b.y + pad }} />
          <span data-handle="p2" className="ov-handle" style={{ left: it.x2 - b.x + pad, top: it.y2 - b.y + pad }} />
        </>
      )}
      {(it.t === "rect" || it.t === "ellipse") && <span data-handle="p2" className="ov-handle" style={{ left: it.x2 - b.x + pad, top: it.y2 - b.y + pad }} />}
      {it.t === "sticker" && (
        <>
          <span data-handle="scale" className="ov-handle" style={{ left: "100%", top: "100%" }} />
          <span data-handle="rotate" className="ov-handle rotate" style={{ left: "50%", top: -18 }} />
        </>
      )}
      {it.t === "note" && <span data-handle="width" className="ov-handle" style={{ left: "100%", top: "50%" }} />}
    </div>
  );
}

function SelectionBar({ it, noteHeight, onDelete, onFront, onColor }: { it: OverlayItem; noteHeight: (id: string) => number; onDelete: () => void; onFront: () => void; onColor?: (c: string) => void }) {
  const b = bbox(it, noteHeight);
  return (
    <div className="ov-toolbar" style={{ left: b.x + b.w / 2, top: Math.max(0, b.y - 58) }} onPointerDown={(e) => e.stopPropagation()}>
      {onColor && NOTE_COLORS.map((c) => <button key={c} className="ov-swatch" style={{ background: c === "transparent" ? "linear-gradient(135deg,#fff 45%,#e66 50%,#fff 55%)" : c }} onClick={() => onColor(c)} />)}
      <button onClick={onFront} title="Bring to front">⬆︎</button>
      <button onClick={onDelete} title="Delete (⌫)">🗑</button>
    </div>
  );
}

// ---------- geometry ----------

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

function svgPath(points: number[][]) {
  if (!points.length) return "";
  const d = points.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...points[0], "Q"] as (string | number)[],
  );
  return d.join(" ") + " Z";
}

function bbox(it: OverlayItem, noteHeight: (id: string) => number) {
  switch (it.t) {
    case "pen": {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < it.pts.length; i += 3) {
        x0 = Math.min(x0, it.pts[i]); x1 = Math.max(x1, it.pts[i]);
        y0 = Math.min(y0, it.pts[i + 1]); y1 = Math.max(y1, it.pts[i + 1]);
      }
      const h = it.size / 2;
      return { x: x0 - h, y: y0 - h, w: x1 - x0 + it.size, h: y1 - y0 + it.size };
    }
    case "sticker":
      return { x: it.x - it.s / 2, y: it.y - it.s / 2, w: it.s, h: it.s };
    case "note":
      return { x: it.x, y: it.y, w: it.w, h: noteHeight(it.id) };
    default:
      return { x: Math.min(it.x1, it.x2), y: Math.min(it.y1, it.y2), w: Math.abs(it.x2 - it.x1), h: Math.abs(it.y2 - it.y1) };
  }
}

export function overlayBottom(items: OverlayItem[]) {
  return items.reduce((m, it) => {
    const b = bbox(it, () => 80);
    return Math.max(m, b.y + b.h);
  }, 0);
}

function segDist(p: Pt, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / l2)) : 0;
  return Math.hypot(p.x - (x1 + t * dx), p.y - (y1 + t * dy));
}

function hit(it: OverlayItem, p: Pt, tol: number, noteHeight: (id: string) => number): boolean {
  switch (it.t) {
    case "pen": {
      const r = it.size / 2 + tol;
      if (it.pts.length === 3) return Math.hypot(p.x - it.pts[0], p.y - it.pts[1]) < r;
      for (let i = 0; i + 5 < it.pts.length; i += 3) {
        if (segDist(p, it.pts[i], it.pts[i + 1], it.pts[i + 3], it.pts[i + 4]) < r) return true;
      }
      return false;
    }
    case "line":
    case "arrow":
      return segDist(p, it.x1, it.y1, it.x2, it.y2) < it.size / 2 + tol;
    case "rect": {
      const b = bbox(it, noteHeight);
      const inside = p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
      if (it.fill && inside) return true;
      const r = it.size / 2 + tol;
      return (
        segDist(p, b.x, b.y, b.x + b.w, b.y) < r ||
        segDist(p, b.x + b.w, b.y, b.x + b.w, b.y + b.h) < r ||
        segDist(p, b.x, b.y + b.h, b.x + b.w, b.y + b.h) < r ||
        segDist(p, b.x, b.y, b.x, b.y + b.h) < r
      );
    }
    case "ellipse": {
      const b = bbox(it, noteHeight);
      const rx = b.w / 2 || 1, ry = b.h / 2 || 1;
      const nx = (p.x - b.x - rx) / rx, ny = (p.y - b.y - ry) / ry;
      const d = Math.hypot(nx, ny);
      if (it.fill && d <= 1) return true;
      return Math.abs(d - 1) * Math.min(rx, ry) < it.size / 2 + tol;
    }
    default: {
      const b = bbox(it, noteHeight);
      return p.x >= b.x - tol && p.x <= b.x + b.w + tol && p.y >= b.y - tol && p.y <= b.y + b.h + tol;
    }
  }
}

function topHit(items: OverlayItem[], p: Pt, tol: number, noteHeight: (id: string) => number) {
  for (let i = items.length - 1; i >= 0; i--) if (hit(items[i], p, tol, noteHeight)) return items[i];
  return undefined;
}

function translate(it: OverlayItem, dx: number, dy: number): OverlayItem {
  switch (it.t) {
    case "pen":
      return { ...it, pts: it.pts.map((v, i) => (i % 3 === 0 ? r1(v + dx) : i % 3 === 1 ? r1(v + dy) : v)) };
    case "sticker":
    case "note":
      return { ...it, x: it.x + dx, y: it.y + dy };
    default:
      return { ...it, x1: it.x1 + dx, y1: it.y1 + dy, x2: it.x2 + dx, y2: it.y2 + dy };
  }
}

function applyHandle(it: OverlayItem, handle: string, pt: Pt, start: Pt): OverlayItem {
  if (it.t === "sticker") {
    if (handle === "rotate") {
      const a = (Math.atan2(pt.y - it.y, pt.x - it.x) * 180) / Math.PI + 90;
      return { ...it, r: Math.round(a) };
    }
    const d0 = Math.hypot(start.x - it.x, start.y - it.y) || 1;
    const d1 = Math.hypot(pt.x - it.x, pt.y - it.y);
    return { ...it, s: Math.max(24, Math.min(600, Math.round((it.s * d1) / d0))) };
  }
  if (it.t === "note") return { ...it, w: Math.max(80, Math.round(it.w + pt.x - start.x)) };
  if (it.t === "pen") return it;
  return handle === "p1" ? { ...it, x1: pt.x, y1: pt.y } : { ...it, x2: pt.x, y2: pt.y };
}
