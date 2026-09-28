import type { Editor, JSONContent } from "@tiptap/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { saveFile } from "../lib/files";
import { inTauri } from "../lib/native";
import { PAGE_MIN_HEIGHT, PAGE_WIDTH, paperStyle } from "../lib/paper";
import { go, navigate } from "../lib/route";
import { createPage, deletePage, getPage as getPageById, updatePage, useNotepad, useNotepads, usePages } from "../lib/store";
import type { Page } from "../lib/types";
import { tiltFor } from "./Bookstand";
import { Cover } from "./Cover";
import { CoverStudio } from "./CoverStudio";
import { bridge, type MathTarget } from "./editor/bridge";
import { PageEditor } from "./editor/PageEditor";
import { Overlay, overlayBottom, type Tool } from "./Overlay";
import { MathEditor, StickerPicker } from "./Pickers";
import { SyncBadge } from "./SyncBadge";
import { INKS, TOOL_KEYS, Toolbar, type Mode } from "./Toolbar";

export function Notebook({ notepadId, pageId }: { notepadId: string; pageId?: string }) {
  const notepad = useNotepad(notepadId);
  const notepads = useNotepads();
  const pages = usePages(notepadId);
  const page = pages.find((p) => p.id === pageId) ?? pages[0];

  const [editor, setEditor] = useState<Editor | null>(null);
  const [mode, setMode] = useState<Mode>("write");
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(INKS[0]);
  const [size, setSize] = useState(4);
  const [fill, setFill] = useState(false);
  const [pendingSticker, setPendingSticker] = useState<string | null>(null);
  const [math, setMath] = useState<MathTarget | null>(null);
  const [stickers, setStickers] = useState(false);
  const [studio, setStudio] = useState(false);
  const [pageList, setPageList] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Notepad deleted elsewhere (or bad link): back to the shelf.
  useEffect(() => {
    if (!notepad) navigate({ view: "shelf" }, { replace: true });
  }, [notepad]);

  const goPage = useCallback(
    (p: Page | undefined) => p && navigate({ view: "book", id: notepadId, page: p.id }, { replace: true }),
    [notepadId],
  );
  const index = page ? pages.indexOf(page) : 0;
  // Which way the page turns, fixed per page so re-renders don't restart it.
  const turnFor = useRef<{ id?: string; index: number; turn: "open" | "next" | "prev" }>({ index, turn: "open" });
  if (page && turnFor.current.id !== page.id) {
    const prev = turnFor.current;
    const turn = prev.id === undefined ? "open" : index > prev.index ? "next" : "prev";
    turnFor.current = { id: page.id, index, turn };
  }
  const turn = turnFor.current.turn;

  // ---------- bridge for slash commands ----------
  useEffect(() => {
    bridge.pickImage = () => fileInput.current?.click();
    bridge.openMath = setMath;
    bridge.openStickers = () => setStickers(true);
    bridge.startDrawing = (t) => {
      setMode("draw");
      setTool(t);
    };
  }, []);

  // ---------- shortcuts ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const switchMod = inTauri ? mod : e.ctrlKey && !e.metaKey;
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setMode((m) => (m === "write" ? "draw" : "write"));
        setPendingSticker(null);
        return;
      }
      if (switchMod && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const n = Number(e.key);
        if (n === 0) go({ view: "shelf" });
        else if (notepads[n - 1]) go({ view: "book", id: notepads[n - 1].id });
        return;
      }
      if (e.ctrlKey && (e.key === "[" || e.key === "]")) {
        e.preventDefault();
        goPage(pages[index + (e.key === "]" ? 1 : -1)]);
        return;
      }
      const t = e.target as HTMLElement;
      const typing = t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA";
      if (mode === "draw" && !typing && !mod && TOOL_KEYS[e.key]) {
        setTool(TOOL_KEYS[e.key]);
        setPendingSticker(null);
      }
      if (mode === "draw" && e.key === "Escape" && !typing) {
        if (pendingSticker) setPendingSticker(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notepads, pages, index, goPage, mode, pendingSticker]);

  // ---------- sizing ----------
  const areaRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [areaWidth, setAreaWidth] = useState(PAGE_WIDTH);
  const [textHeight, setTextHeight] = useState(0);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      if (areaRef.current) setAreaWidth(areaRef.current.clientWidth);
      if (textRef.current) setTextHeight(textRef.current.offsetHeight);
    });
    if (areaRef.current) ro.observe(areaRef.current);
    if (textRef.current) ro.observe(textRef.current);
    return () => ro.disconnect();
  }, [page?.id]);

  if (!notepad) return <div className="desk" />;
  if (!page) {
    // Pages may still be on their way from another device.
    return (
      <div className="desk empty-book">
        <button className="btn primary" onClick={() => goPage(getPageById(createPage(notepad.id)))}>
          + start a page
        </button>
      </div>
    );
  }

  const sheetWidth = Math.min(PAGE_WIDTH, areaWidth - (areaWidth < 700 ? 16 : 48));
  const compact = sheetWidth < PAGE_WIDTH * 0.8;
  const scale = sheetWidth / PAGE_WIDTH;
  const minHeight = compact ? Math.max(window.innerHeight - 200, 500) : PAGE_MIN_HEIGHT;
  const sheetHeight = Math.max(minHeight, textHeight + 120, (overlayBottom(page.overlay) + 160) * scale);
  const paper = paperStyle(notepad.paper, compact);

  const insertImages = async (files: FileList | null) => {
    for (const f of [...(files ?? [])]) {
      const fileId = await saveFile(f);
      const float = f.type === "image/png" ? "left" : "none";
      editor?.chain().focus().insertFigure({ fileId, float, width: float === "none" ? 420 : 260 }).run();
    }
  };

  const saveMath = (latex: string) => {
    const t = math;
    setMath(null);
    if (!editor || !t) return;
    const c = editor.chain().focus();
    if (t.pos !== undefined) {
      if (!latex.trim()) (t.kind === "inline" ? c.deleteInlineMath({ pos: t.pos }) : c.deleteBlockMath({ pos: t.pos })).run();
      else (t.kind === "inline" ? c.updateInlineMath({ latex, pos: t.pos }) : c.updateBlockMath({ latex, pos: t.pos })).run();
    } else if (latex.trim()) {
      (t.kind === "inline" ? c.insertInlineMath({ latex }) : c.insertBlockMath({ latex })).run();
    }
  };

  return (
    <div className="desk notebook-view" style={{ "--ribbon": notepad.cover.ribbon, "--fur": notepad.cover.fur } as CSSProperties}>
      <nav className="rail" aria-label="Notepads">
        <button className="rail-shelf" onClick={() => go({ view: "shelf" })} title="Bookstand (Ctrl+0)">
          <span>☰</span>
        </button>
        {notepads.map((n, i) => (
          <button
            key={n.id}
            className={`rail-tab ${n.id === notepad.id ? "on" : ""}`}
            style={{ "--tilt": `${tiltFor(n.id)}deg` } as CSSProperties}
            onClick={() => n.id !== notepad.id && go({ view: "book", id: n.id })}
            title={`${n.title}${i < 9 ? ` (${inTauri ? "⌘" : "Ctrl+"}${i + 1})` : ""}`}
          >
            <Cover cover={n.cover} width={46} />
          </button>
        ))}
      </nav>

      <div className="book-main">
        <header className="book-header" data-tauri-drag-region>
          <button className="icon-btn only-compact" onClick={() => go({ view: "shelf" })} aria-label="Bookstand">
            ‹
          </button>
          <button className="book-title" onClick={() => setStudio(true)} title="Customise notepad">
            <span className="book-title-cover"><Cover cover={notepad.cover} width={26} /></span>
            {notepad.title || "Untitled"}
          </button>
          <span className="grow" />
          <SyncBadge />
        </header>

        <Toolbar
          editor={editor}
          mode={mode}
          setMode={(m) => {
            setMode(m);
            setPendingSticker(null);
          }}
          tool={tool}
          setTool={(t) => {
            setTool(t);
            setPendingSticker(null);
          }}
          color={color}
          setColor={setColor}
          size={size}
          setSize={setSize}
          fill={fill}
          setFill={setFill}
          onImage={() => fileInput.current?.click()}
          onSticker={() => setStickers(true)}
          onMath={() => setMath({ kind: "inline", latex: "" })}
        />

        <div className="sheet-area" ref={areaRef}>
          <div
            className={`sheet-stack turn-${turn} ${compact ? "compact" : ""}`}
            style={{ width: sheetWidth, viewTransitionName: `book-${notepad.id}` } as CSSProperties}
            key={page.id}
          >
            <div
              className={`sheet mode-${mode}`}
              style={{ ...paper, height: sheetHeight }}
              onMouseDown={(e) => {
                if (mode === "write" && e.target === e.currentTarget) {
                  e.preventDefault();
                  editor?.commands.focus("end");
                }
              }}
            >
              <span className="sheet-ribbon" />
              <div className="sheet-text" ref={textRef}>
                <PageEditor page={page} onEditor={setEditor} />
              </div>
              <Overlay
                items={page.overlay}
                onChange={(overlay) => updatePage(page.id, { overlay })}
                active={mode === "draw"}
                tool={tool}
                color={color}
                size={size}
                fill={fill}
                pendingSticker={pendingSticker}
                onPlaced={() => {
                  setPendingSticker(null);
                  setTool("select");
                }}
                scale={scale}
                height={sheetHeight / scale}
              />
            </div>
          </div>
        </div>

        <footer className="page-nav">
          <button className="icon-btn" disabled={index === 0} onClick={() => goPage(pages[index - 1])} aria-label="Previous page" title="Previous page (Ctrl+[)">
            ‹
          </button>
          <span className="tb-pop-wrap">
            <button className="page-count" onClick={() => setPageList((v) => !v)}>
              page {index + 1} <span className="muted">of {pages.length}</span>
            </button>
            {pageList && (
              <PageList
                pages={pages}
                current={page.id}
                onPick={(p) => {
                  goPage(p);
                  setPageList(false);
                }}
                onDelete={(p) => {
                  if (pages.length > 1) {
                    if (p.id === page.id) goPage(pages[index === 0 ? 1 : index - 1]);
                    deletePage(p.id);
                  }
                }}
              />
            )}
          </span>
          <button className="icon-btn" disabled={index === pages.length - 1} onClick={() => goPage(pages[index + 1])} aria-label="Next page" title="Next page (Ctrl+])">
            ›
          </button>
          <button
            className="btn small"
            onClick={() => {
              const id = createPage(notepad.id, page.id);
              navigate({ view: "book", id: notepad.id, page: id }, { replace: true });
            }}
          >
            + page
          </button>
        </footer>
      </div>

      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => (insertImages(e.target.files), (e.target.value = ""))} />
      {math && <MathEditor target={math} onSave={saveMath} onClose={() => setMath(null)} />}
      {stickers && (
        <StickerPicker
          onClose={() => setStickers(false)}
          onPick={(k) => {
            setStickers(false);
            setMode("draw");
            setPendingSticker(k);
          }}
        />
      )}
      {studio && <CoverStudio notepadId={notepad.id} onClose={() => setStudio(false)} />}
      {pendingSticker && <div className="hint-toast">Tap the page to stick it · Esc to cancel</div>}
    </div>
  );
}

function PageList({ pages, current, onPick, onDelete }: { pages: Page[]; current: string; onPick: (p: Page) => void; onDelete: (p: Page) => void }) {
  return (
    <div className="page-list">
      {pages.map((p, i) => (
        <div key={p.id} className={`page-list-row ${p.id === current ? "on" : ""}`}>
          <button onClick={() => onPick(p)}>
            <span className="muted">{i + 1}</span> {firstLine(p.doc) || <i className="muted">empty page</i>}
          </button>
          {pages.length > 1 && (
            <button className="page-del" onClick={() => onDelete(p)} title="Delete page">
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function firstLine(doc: JSONContent | null): string {
  if (!doc) return "";
  const walk = (n: JSONContent): string => {
    if (n.text) return n.text;
    for (const c of n.content ?? []) {
      const t = walk(c);
      if (t.trim()) return t;
    }
    return "";
  };
  return walk(doc).slice(0, 48);
}
