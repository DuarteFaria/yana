import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFileUrl } from "../../lib/files";

// An image that floats in the text. Text wraps around it; with "tight" wrap
// it hugs the visible outline of transparent PNGs (stickers, cut-outs).

export type FigureFloat = "left" | "right" | "none";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figure: {
      insertFigure: (attrs: { fileId?: string; src?: string; width?: number; float?: FigureFloat }) => ReturnType;
    };
  }
}

export const Figure = Node.create({
  name: "figure",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      fileId: { default: null },
      src: { default: null },
      width: { default: 300 },
      float: { default: "left" },
      tight: { default: true },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-figure]",
        getAttrs: (el) => ({
          fileId: el.getAttribute("data-file"),
          src: el.getAttribute("data-src"),
          width: Number(el.getAttribute("data-width")) || 300,
          float: el.getAttribute("data-float") ?? "left",
        }),
      },
      { tag: "img[src]", getAttrs: (el) => ({ src: el.getAttribute("src"), float: "none", width: 420 }) },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-figure": "",
        "data-file": node.attrs.fileId,
        "data-src": node.attrs.src,
        "data-width": node.attrs.width,
        "data-float": node.attrs.float,
      }),
    ];
  },

  addCommands() {
    return {
      insertFigure:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { width: 300, float: "left", ...attrs } }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureView, {
      className: "figure-host",
      attrs: ({ node }) => ({ "data-float": node.attrs.float }),
    });
  },
});

function FigureView({ node, updateAttributes, selected, deleteNode, editor }: ReactNodeViewProps) {
  const { fileId, src, width, float, tight } = node.attrs as {
    fileId: string | null;
    src: string | null;
    width: number;
    float: FigureFloat;
    tight: boolean;
  };
  const localUrl = useFileUrl(fileId);
  const url = fileId ? localUrl : src;
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [shape, setShape] = useState<string | null>(null);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const w = liveWidth ?? width;

  // Tight wrap: trace the opaque outline into a CSS polygon.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !url || float === "none" || !tight) return setShape(null);
    let alive = true;
    const run = () => {
      const poly = outlinePolygon(img, float);
      if (alive) setShape(poly);
    };
    if (img.complete && img.naturalWidth) run();
    else img.addEventListener("load", run, { once: true });
    return () => {
      alive = false;
    };
  }, [url, float, tight, w]);

  // Keep the paper's line rhythm: round the figure's height up to whole lines.
  useLayoutEffect(() => {
    const host = wrapRef.current?.parentElement;
    const img = imgRef.current;
    if (!host || !img) return;
    const ro = new ResizeObserver(() => {
      const line = parseFloat(getComputedStyle(host).getPropertyValue("--line")) || 30;
      const h = img.offsetHeight;
      const extra = Math.ceil((h + 6) / line) * line - h;
      host.style.setProperty("--figure-pad", `${extra}px`);
    });
    ro.observe(img);
    return () => ro.disconnect();
  }, [url]);

  useLayoutEffect(() => {
    const host = wrapRef.current?.parentElement;
    if (!host) return;
    host.style.width = float === "none" ? "" : `${w}px`;
    host.style.shapeOutside = shape ?? "";
  }, [w, float, shape]);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = w;
    const scale = (wrapRef.current?.getBoundingClientRect().width ?? w) / w || 1;
    const dir = float === "right" ? -1 : 1;
    const move = (ev: PointerEvent) => {
      const maxW = (wrapRef.current?.closest(".ProseMirror") as HTMLElement | null)?.clientWidth ?? 700;
      setLiveWidth(Math.round(Math.max(60, Math.min(maxW, startW + (dir * (ev.clientX - startX)) / scale))));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setLiveWidth((lw) => {
        if (lw !== null) updateAttributes({ width: lw });
        return null;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <NodeViewWrapper ref={wrapRef} className={`figure ${selected ? "selected" : ""}`}>
      {url ? (
        <img
          ref={imgRef}
          src={url}
          alt=""
          draggable={false}
          data-drag-handle
          style={{ width: w }}
        />
      ) : (
        <div className="figure-missing" style={{ width: w }} data-drag-handle>
          image is on its way…
        </div>
      )}
      {selected && editor.isEditable && (
        <>
          <span className={`figure-resize ${float === "right" ? "left" : "right"}`} onPointerDown={startResize} />
          <div className="figure-menu" contentEditable={false}>
            <button className={float === "left" ? "on" : ""} onClick={() => updateAttributes({ float: "left" })} title="Text on the right">
              ◧
            </button>
            <button className={float === "none" ? "on" : ""} onClick={() => updateAttributes({ float: "none" })} title="On its own line">
              ▣
            </button>
            <button className={float === "right" ? "on" : ""} onClick={() => updateAttributes({ float: "right" })} title="Text on the left">
              ◨
            </button>
            {float !== "none" && (
              <button className={tight ? "on" : ""} onClick={() => updateAttributes({ tight: !tight })} title="Wrap text tightly around the shape">
                ✂︎
              </button>
            )}
            <button onClick={() => deleteNode()} title="Remove">
              🗑
            </button>
          </div>
        </>
      )}
    </NodeViewWrapper>
  );
}

/**
 * Scan rows of the rendered image and build a polygon hugging the opaque
 * pixels on the side facing the text. Returns null for fully opaque images
 * (a plain rectangle wrap is already what the float does).
 */
function outlinePolygon(img: HTMLImageElement, side: "left" | "right"): string | null {
  const w = Math.round(img.width);
  const h = Math.round(img.height);
  if (!w || !h) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const step = 6;
    const pts: [number, number][] = [];
    let transparent = false;
    for (let y = 0; y < h; y += step) {
      let edge = side === "left" ? 0 : w;
      for (let yy = y; yy < Math.min(h, y + step); yy++) {
        if (side === "left") {
          for (let x = w - 1; x >= edge; x--) {
            if (data[(yy * w + x) * 4 + 3] > 40) {
              edge = Math.max(edge, x);
              break;
            }
          }
        } else {
          for (let x = 0; x < edge; x++) {
            if (data[(yy * w + x) * 4 + 3] > 40) {
              edge = Math.min(edge, x);
              break;
            }
          }
        }
      }
      if ((side === "left" && edge < w - 2) || (side === "right" && edge > 1)) transparent = true;
      pts.push([edge, y], [edge, Math.min(h, y + step)]);
    }
    if (!transparent) return null;
    const outer = side === "left" ? 0 : w;
    const poly = [[outer, 0], ...pts, [outer, h]].map(([x, y]) => `${x}px ${y}px`).join(", ");
    return `polygon(${poly}) border-box`;
  } catch {
    return null; // cross-origin image: canvas is tainted
  }
}
