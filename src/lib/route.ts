import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

export type Route = { view: "shelf" } | { view: "book"; id: string; page?: string };

function parse(): Route {
  const m = location.hash.match(/^#\/n\/([^/]+)(?:\/([^/]+))?/);
  return m ? { view: "book", id: m[1], page: m[2] } : { view: "shelf" };
}

let current = parse();
const listeners = new Set<() => void>();

function sync() {
  current = parse();
  listeners.forEach((l) => l());
}
window.addEventListener("hashchange", sync);
window.addEventListener("popstate", sync);

export function useRoute() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

/** Runs `l` after every route change (outside React). */
export function onRouteChange(l: (r: Route) => void) {
  const run = () => l(current);
  listeners.add(run);
  return () => listeners.delete(run);
}

/** Updates the route synchronously (needed so view transitions can snapshot it). */
export function navigate(r: Route, opts: { replace?: boolean } = {}) {
  const hash = r.view === "shelf" ? "#/" : `#/n/${r.id}${r.page ? `/${r.page}` : ""}`;
  if (hash === location.hash) return;
  if (opts.replace) history.replaceState(null, "", hash);
  else history.pushState(null, "", hash);
  sync();
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Run a DOM-changing update as a view transition when the browser supports
 * it: elements sharing a `view-transition-name` morph into each other (a
 * notepad cover grows into its open page and shrinks back).
 */
export function withTransition(update: () => void, kind: "nav" | "shelf" = "nav"): Promise<void> {
  if (!document.startViewTransition || reducedMotion()) {
    update();
    return Promise.resolve();
  }
  const root = document.documentElement;
  root.dataset.vt = kind;
  const t = document.startViewTransition(() => flushSync(update));
  return t.finished.catch(() => {}).finally(() => {
    delete root.dataset.vt;
  });
}

/** Navigate with the cover ↔ page morph. */
export function go(r: Route) {
  withTransition(() => navigate(r));
}
