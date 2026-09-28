import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { go, withTransition } from "../lib/route";
import { createNotepad, deleteNotepad, useNotepads } from "../lib/store";
import { showToast } from "../lib/toast";
import type { Notepad } from "../lib/types";
import { Cover } from "./Cover";
import { CoverStudio } from "./CoverStudio";
import { DECOR, Decor, FairyLights, Moss, type DecorKey } from "./Decor";
import { SyncBadge } from "./SyncBadge";
import { ReadingCorner } from "./ReadingCorner";

/** Stable little tilt per notepad so the shelf looks hand-arranged. */
export function tiltFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 9) - 4) * 0.9;
}

// What lives on each shelf, in order of preference (cycled for extra rows).
const POOLS: DecorKey[][] = [
  ["fern", "bookstack", "jar", "succulent", "candle"],
  ["minibooks", "cat", "teacup", "pumpkin", "succulent"],
  ["ivy", "candle", "bookstack", "pumpkin", "jar"],
  ["teacup", "fern", "minibooks", "succulent", "pumpkin"],
];
const CROWN: DecorKey[] = ["globe", "minibooks", "pumpkin", "fern", "candle"];
const MIN_ROWS = 3;
const GAP = 18;

type Slot =
  | { kind: "book"; notepad: Notepad; index: number }
  | { kind: "add"; index: number }
  | { kind: "decor"; key: DecorKey; id: string; v: number };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function pickDecor(pool: DecorKey[], free: number, scale: number, max = pool.length) {
  const out: DecorKey[] = [];
  for (const k of pool) {
    if (out.length >= max) break;
    const w = DECOR[k].w * scale + GAP;
    if (w <= free) {
      out.push(k);
      free -= w;
    }
  }
  return out;
}

/** Greedy shelf packing: books first, then decor fills what's left. */
function packShelves(notepads: Notepad[], width: number, compact: boolean) {
  const scale = compact ? 0.62 : 1;
  const slotW = (compact ? 104 : 150) + GAP + (compact ? 6 : 12);
  const items: Slot[] = [...notepads.map((n, i) => ({ kind: "book" as const, notepad: n, index: i })), { kind: "add" as const, index: notepads.length }];
  const rows: Slot[][] = [];
  let i = 0;
  for (let r = 0; (i < items.length || rows.length < MIN_ROWS) && r < 60; r++) {
    const pool = POOLS[r % POOLS.length];
    const reserve = Math.min(...pool.map((k) => DECOR[k].w * scale)) + GAP;
    const books: Slot[] = [];
    let used = 0;
    while (i < items.length && (used + slotW <= width - reserve || books.length === 0)) {
      books.push(items[i++]);
      used += slotW;
    }
    const decor = pickDecor(pool, width - used, scale, books.length ? 3 : 5).map(
      (key, j): Slot => ({ kind: "decor", key, id: `${r}-${j}-${key}`, v: r + j }),
    );
    // Bookends at the sides, anything extra tucked between books.
    const [a, b, ...rest] = decor;
    const row: Slot[] = [];
    if (a && r % 2 === 1) row.push(a);
    if (b && r % 2 === 0) row.push(b);
    books.forEach((bk, k) => {
      row.push(bk);
      if (rest.length && k === Math.floor(books.length / 2) - 1) row.push(rest.shift()!);
    });
    row.push(...rest);
    if (a && r % 2 === 0) row.push(a);
    if (b && r % 2 === 1) row.push(b);
    rows.push(row);
  }
  const crown = pickDecor(CROWN, width - 40, scale, 4).map((key, j): Slot => ({ kind: "decor", key, id: `crown-${j}-${key}`, v: j }));
  return { rows, crown, scale, coverW: compact ? 104 : 150 };
}

export function Bookstand() {
  const notepads = useNotepads();
  const [editing, setEditing] = useState<string | null>(null);
  const [unitRef, unitW] = useWidth<HTMLDivElement>();
  const wide = useWide();
  const compact = unitW > 0 && unitW < 640;
  const inner = Math.max(0, unitW - (compact ? 40 : 96));
  const { rows, crown, scale, coverW } = useMemo(() => packShelves(notepads, inner, compact), [notepads, inner, compact]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 9 && notepads[n - 1]) go({ view: "book", id: notepads[n - 1].id });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notepads, editing]);

  const addNotepad = () => {
    let id = "";
    withTransition(() => {
      id = createNotepad();
    }, "shelf").then(() => setEditing(id));
  };

  const renderSlot = (s: Slot): ReactNode => {
    if (s.kind === "book") return <NotepadCard key={s.notepad.id} notepad={s.notepad} index={s.index} width={coverW} onCustomise={() => setEditing(s.notepad.id)} />;
    if (s.kind === "add")
      return (
        <button key="add" className="add-slot" style={{ "--i": s.index, width: coverW, height: coverW * 1.36, viewTransitionName: "add-slot" } as CSSProperties} onClick={addNotepad} aria-label="New notepad">
          <span className="add-plus">+</span>
          <span className="add-label">new notepad</span>
        </button>
      );
    return (
      <div key={s.id} className="slot-decor" style={{ viewTransitionName: `decor-${s.id}` } as CSSProperties}>
        <Decor k={s.key} v={s.v} scale={scale} />
      </div>
    );
  };

  const shelf = (
    <div className="unit" ref={unitRef}>
      <span className="pipe left" aria-hidden />
      <span className="pipe right" aria-hidden />
      {inner > 0 && (
        <>
          <Shelf className="crown" items={crown.map(renderSlot)} seed={99} />
          <div className="lights-row" aria-hidden>
            <FairyLights width={inner} sags={compact ? 2 : 3} />
          </div>
          {/* In the room the shelf grows upward: notepad 1 sits nearest the floor. */}
          {(wide ? [...rows].reverse() : rows).map((row) => {
            const r = rows.indexOf(row);
            return <Shelf key={r} items={row.map(renderSlot)} seed={r} />;
          })}
        </>
      )}
    </div>
  );

  return (
    <div className={`desk shelf-view room ${compact ? "compact" : ""} ${wide ? "wide" : ""}`}>
      <header className="shelf-header" data-tauri-drag-region>
        <SyncBadge />
      </header>
      {wide ? (
        // The whole scene scrolls together, starting at the floor: scrolling
        // up pans up the bookcase while the room slides away below.
        <div className="scene">
          <div className="floor" aria-hidden />
          <ReadingCorner />
          <section className="shelf-col">{shelf}</section>
        </div>
      ) : (
        <section className="shelf-col">{shelf}</section>
      )}

      {editing && <CoverStudio notepadId={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** Two-half room (reading corner + shelf) on wide screens. */
function useWide() {
  const q = "(min-width: 1000px)";
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

function Shelf({ items, seed, className }: { items: ReactNode[]; seed: number; className?: string }) {
  return (
    <div className={`shelf ${className ?? ""}`}>
      <div className="shelf-items">{items}</div>
      <div className="plank">
        {seed % 2 === 0 && <Moss x={`${8 + ((seed * 31) % 50)}%`} w={110} seed={seed} />}
        {seed % 3 === 1 && <Moss x={`${60 + ((seed * 17) % 25)}%`} w={80} seed={seed + 5} />}
      </div>
    </div>
  );
}

function putAway(notepad: Notepad) {
  withTransition(() => {
    const undo = deleteNotepad(notepad.id);
    showToast({
      message: `“${notepad.title || "Untitled"}” was put away`,
      action: { label: "Undo", run: () => void withTransition(undo, "shelf") },
    });
  }, "shelf");
}

function NotepadCard({ notepad, index, width, onCustomise }: { notepad: Notepad; index: number; width: number; onCustomise: () => void }) {
  return (
    <div
      className="card"
      style={{ "--tilt": `${tiltFor(notepad.id)}deg`, "--i": index, viewTransitionName: `card-${notepad.id}` } as CSSProperties}
    >
      <button
        className="card-open"
        onClick={() => go({ view: "book", id: notepad.id })}
        onContextMenu={(e) => {
          e.preventDefault();
          onCustomise();
        }}
        aria-label={`Open ${notepad.title}`}
        style={{ viewTransitionName: `book-${notepad.id}` } as CSSProperties}
      >
        <Cover cover={notepad.cover} width={width} title={notepad.title} />
      </button>
      <button className="card-delete" onClick={() => putAway(notepad)} aria-label={`Delete ${notepad.title}`} title="Delete">
        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </button>
      <div className="tag" style={{ "--tag-tilt": `${-tiltFor(notepad.id) * 1.5}deg` } as CSSProperties}>
        <span className="tag-hole" />
        {index < 9 && <kbd className="card-key">{index + 1}</kbd>}
        <span className="card-title">{notepad.title || "Untitled"}</span>
        <button className="card-edit" onClick={onCustomise} aria-label="Customise" title="Customise">
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden>
            <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
