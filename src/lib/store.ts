import { useMemo, useSyncExternalStore } from "react";
import { db } from "./db";
import { newId } from "./ids";
import { PRESETS, suggestedPreset, suggestedTitle } from "./presets";
import type { Character, Notepad, Page, RecordKind, Stored } from "./types";

// In-memory mirror of IndexedDB. Every write goes to memory first (so the UI
// never waits) and is then persisted; `dirty` records are picked up by sync.

const notepads = new Map<string, Stored<Notepad>>();
const pages = new Map<string, Stored<Page>>();
/** Bumped when a page is replaced by a newer version from another device. */
const remoteRevs = new Map<string, number>();

let loaded = false;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version++;
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

let writeChain: Promise<unknown> = Promise.resolve();
function persist(kind: RecordKind, rec: Stored<Notepad> | Stored<Page>) {
  writeChain = writeChain
    .then(async () => {
      const d = await db();
      if (kind === "notepad") await d.put("notepads", rec as Stored<Notepad>);
      else await d.put("pages", rec as Stored<Page>);
    })
    .catch((e) => console.error("YANA: failed to save locally", e));
}

/** Resolves once everything written so far is on disk. */
export function flushWrites() {
  return writeChain;
}

function stamp(prev?: number) {
  return Math.max(Date.now(), (prev ?? 0) + 1);
}

export async function loadStore() {
  const d = await db();
  const [ns, ps] = await Promise.all([d.getAll("notepads"), d.getAll("pages")]);
  ns.forEach((n) => notepads.set(n.id, n));
  ps.forEach((p) => pages.set(p.id, p));
  loaded = true;
  emit();
}

// ---------- hooks ----------

function useVersion() {
  return useSyncExternalStore(subscribe, () => version);
}

export function useLoaded() {
  useVersion();
  return loaded;
}

export function useNotepads(): Notepad[] {
  const v = useVersion();
  return useMemo(
    () =>
      [...notepads.values()]
        .filter((n) => !n.deleted)
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
    [v],
  );
}

export function useNotepad(id: string | null) {
  useVersion();
  const n = id ? notepads.get(id) : undefined;
  return n && !n.deleted ? n : undefined;
}

export function usePages(notepadId: string | null): Page[] {
  const v = useVersion();
  return useMemo(
    () =>
      [...pages.values()]
        .filter((p) => p.notepadId === notepadId && !p.deleted)
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
    [v, notepadId],
  );
}

export function usePage(id: string | null) {
  useVersion();
  const p = id ? pages.get(id) : undefined;
  return p && !p.deleted ? p : undefined;
}

export function useRemoteRev(pageId: string | null) {
  useVersion();
  return pageId ? (remoteRevs.get(pageId) ?? 0) : 0;
}

export function getPage(id: string) {
  return pages.get(id);
}

// ---------- actions ----------

export function createNotepad(character?: Character): string {
  const existing = [...notepads.values()].filter((n) => !n.deleted);
  const c = character ?? suggestedPreset(existing.map((n) => n.cover.character));
  const preset = PRESETS[c];
  const t = Date.now();
  const n: Stored<Notepad> = {
    id: newId(),
    title: suggestedTitle(c),
    order: existing.reduce((m, x) => Math.max(m, x.order), 0) + 1,
    cover: { ...preset.cover },
    paper: { ...preset.paper },
    createdAt: t,
    updatedAt: t,
    deleted: false,
    dirty: 1,
  };
  notepads.set(n.id, n);
  persist("notepad", n);
  createPage(n.id);
  emit();
  return n.id;
}

export function updateNotepad(id: string, patch: Partial<Omit<Notepad, "id">>) {
  const prev = notepads.get(id);
  if (!prev) return;
  const n = { ...prev, ...patch, updatedAt: stamp(prev.updatedAt), dirty: 1 as const };
  notepads.set(id, n);
  persist("notepad", n);
  emit();
}

/** Soft-deletes a notepad and its pages; returns a function that undoes it. */
export function deleteNotepad(id: string): () => void {
  const removed: string[] = [];
  updateNotepad(id, { deleted: true });
  for (const p of pages.values()) {
    if (p.notepadId === id && !p.deleted) {
      updatePage(p.id, { deleted: true });
      removed.push(p.id);
    }
  }
  return () => {
    updateNotepad(id, { deleted: false });
    removed.forEach((pid) => updatePage(pid, { deleted: false }));
  };
}

export function createPage(notepadId: string, afterId?: string): string {
  const siblings = [...pages.values()]
    .filter((p) => p.notepadId === notepadId && !p.deleted)
    .sort((a, b) => a.order - b.order);
  let order = (siblings.at(-1)?.order ?? 0) + 1;
  const i = afterId ? siblings.findIndex((p) => p.id === afterId) : -1;
  if (i >= 0 && i < siblings.length - 1) {
    order = (siblings[i].order + siblings[i + 1].order) / 2;
  }
  const t = Date.now();
  const p: Stored<Page> = {
    id: newId(),
    notepadId,
    order,
    doc: null,
    overlay: [],
    createdAt: t,
    updatedAt: t,
    deleted: false,
    dirty: 1,
  };
  pages.set(p.id, p);
  persist("page", p);
  emit();
  return p.id;
}

export function updatePage(id: string, patch: Partial<Omit<Page, "id">>) {
  const prev = pages.get(id);
  if (!prev) return;
  const p = { ...prev, ...patch, updatedAt: stamp(prev.updatedAt), dirty: 1 as const };
  pages.set(id, p);
  persist("page", p);
  emit();
}

export function deletePage(id: string) {
  updatePage(id, { deleted: true });
}

// ---------- sync plumbing ----------

export type WireRecord = {
  kind: RecordKind;
  id: string;
  data: string;
  updatedAt: number;
  deleted: boolean;
};

function toWire(kind: RecordKind, rec: Stored<Notepad> | Stored<Page>): WireRecord {
  const { id, updatedAt, deleted, dirty: _dirty, ...rest } = rec;
  return { kind, id, updatedAt, deleted, data: JSON.stringify(rest) };
}

// Convex documents max out at 1 MB; a page bigger than this stays local
// rather than blocking sync for everything else.
const MAX_RECORD_BYTES = 900_000;
/** id → updatedAt of the version that was too large to sync. */
const oversized = new Map<string, number>();

function fits(w: WireRecord) {
  if (w.data.length <= MAX_RECORD_BYTES) return true;
  if (oversized.get(w.id) !== w.updatedAt) console.warn(`YANA: page ${w.id} is too large to sync`);
  oversized.set(w.id, w.updatedAt);
  return false;
}

export function dirtyRecords(limit: number): WireRecord[] {
  const out: WireRecord[] = [];
  // Notepads first so a new notepad lands before its pages.
  for (const n of notepads.values()) {
    if (out.length >= limit) return out;
    if (n.dirty) out.push(toWire("notepad", n));
  }
  for (const p of pages.values()) {
    if (out.length >= limit) return out;
    if (!p.dirty || oversized.get(p.id) === p.updatedAt) continue;
    const w = toWire("page", p);
    if (fits(w)) out.push(w);
  }
  return out;
}

export function hasDirty() {
  for (const n of notepads.values()) if (n.dirty) return true;
  for (const p of pages.values()) if (p.dirty && oversized.get(p.id) !== p.updatedAt) return true;
  return false;
}

/** Clear `dirty` for records the server accepted, unless edited meanwhile. */
export function markClean(pushed: WireRecord[], accepted: string[]) {
  const ok = new Set(accepted);
  for (const r of pushed) {
    if (!ok.has(r.id)) continue;
    const map = r.kind === "notepad" ? notepads : pages;
    const cur = map.get(r.id);
    if (cur && cur.updatedAt === r.updatedAt && cur.dirty) {
      const clean = { ...cur, dirty: 0 as const };
      map.set(r.id, clean as never);
      persist(r.kind, clean);
    }
  }
  emit();
}

export function applyRemote(records: WireRecord[]) {
  let changed = false;
  for (const r of records) {
    const map = r.kind === "notepad" ? notepads : pages;
    const cur = map.get(r.id);
    if (cur && cur.updatedAt >= r.updatedAt) continue;
    let data: object;
    try {
      data = JSON.parse(r.data);
    } catch {
      continue;
    }
    const rec = { ...data, id: r.id, updatedAt: r.updatedAt, deleted: r.deleted, dirty: 0 as const };
    map.set(r.id, rec as never);
    persist(r.kind, rec as never);
    if (r.kind === "page") remoteRevs.set(r.id, (remoteRevs.get(r.id) ?? 0) + 1);
    changed = true;
  }
  if (changed) emit();
}
