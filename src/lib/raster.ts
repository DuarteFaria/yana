import { useEffect, useReducer, type RefObject } from "react";

// WebKit (Safari and the Mac app) runs SVG filters such as feTurbulence on the
// CPU, and re-runs them whenever the element is repainted or snapshotted for a
// view transition. Heavy, rarely-changing SVGs are drawn once to a PNG instead.

const SVG_NS = "http://www.w3.org/2000/svg";
/** Unused rasters kept around so going back to a screen doesn't redraw it. */
const KEEP_IDLE = 32;

const rasters = new Map<string, string>();
const pending = new Map<string, Promise<void>>();
const users = new Map<string, number>();

export type RasterBox = { viewBox: [number, number, number, number]; width: number; height: number };

/**
 * PNG URL for the SVG in `ref`, drawn with `box` (viewBox + CSS pixel size), or
 * null until it's ready — render the live SVG meanwhile. `key` must change
 * whenever the drawing would; null skips rasterising.
 */
export function useSvgRaster(key: string | null, ref: RefObject<SVGSVGElement | null>, box: RasterBox): string | null {
  const [, ready] = useReducer((n: number) => n + 1, 0);
  const url = key ? (rasters.get(key) ?? null) : null;

  useEffect(() => {
    if (!key) return;
    users.set(key, (users.get(key) ?? 0) + 1);
    let alive = true;
    // Wait for the drawing to settle (e.g. while dragging a slider).
    const t = rasters.has(key)
      ? 0
      : window.setTimeout(() => {
          if (ref.current) rasterize(key, ref.current, box).then(() => alive && ready(), (e) => console.warn("YANA: raster failed", e));
        }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
      const n = (users.get(key) ?? 1) - 1;
      if (n > 0) users.set(key, n);
      else users.delete(key);
      prune();
    };
    // `box` is derived from `key` by callers.
  }, [key]);

  return url;
}

function rasterize(key: string, el: SVGSVGElement, box: RasterBox) {
  let p = pending.get(key);
  if (!p) {
    p = draw(el, box)
      .then((url) => {
        rasters.set(key, url);
        prune();
      })
      .finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return p;
}

async function draw(el: SVGSVGElement, box: RasterBox): Promise<string> {
  const w = Math.ceil(box.width * devicePixelRatio);
  const h = Math.ceil(box.height * devicePixelRatio);
  const svg = el.cloneNode(true) as SVGSVGElement;
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("viewBox", box.viewBox.join(" "));
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.removeAttribute("style");
  svg.removeAttribute("class");
  // An SVG drawn as an image can't load anything external: inline photos.
  for (const img of svg.querySelectorAll("image")) {
    const href = img.getAttribute("href");
    if (href && !href.startsWith("data:")) img.setAttribute("href", await toDataUrl(href));
  }

  const src = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!png) throw new Error("canvas.toBlob returned nothing");
    return URL.createObjectURL(png);
  } finally {
    URL.revokeObjectURL(src);
  }
}

async function toDataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Frees the oldest rasters nothing is showing once there are too many. */
function prune() {
  const idle = [...rasters.keys()].filter((k) => !users.has(k));
  for (const k of idle.slice(0, Math.max(0, idle.length - KEEP_IDLE))) {
    URL.revokeObjectURL(rasters.get(k)!);
    rasters.delete(k);
  }
}
