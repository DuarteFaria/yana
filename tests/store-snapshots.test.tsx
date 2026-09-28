// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";

let store: typeof import("../src/lib/store");
let root: Root;
let container: HTMLDivElement;

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  store = await import("../src/lib/store");
  await store.loadStore();
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(() => root.unmount());
  await store.flushWrites();
  vi.unstubAllGlobals();
});

test("page saves and sync acknowledgements leave unrelated subscribers alone", async () => {
  const first = store.createNotepad();
  const second = store.createNotepad();
  const page = store.dirtyRecords(100).find((r) => r.kind === "page" && JSON.parse(r.data).notepadId === first)!;
  const renders = { loaded: 0, notepads: 0, notepad: 0, otherPages: 0, pages: 0, page: 0, rev: 0 };
  function Probe({ kind }: { kind: keyof typeof renders }) {
    renders[kind]++;
    const value = {
      loaded: store.useLoaded,
      notepads: store.useNotepads,
      notepad: () => store.useNotepad(first),
      otherPages: () => store.usePages(second),
      pages: () => store.usePages(first),
      page: () => store.usePage(page.id),
      rev: () => store.useRemoteRev(page.id),
    }[kind]();
    return <span>{JSON.stringify(value)}</span>;
  }
  await act(() => root.render(<>{Object.keys(renders).map((kind) => <Probe key={kind} kind={kind as keyof typeof renders} />)}</>));
  await act(() => store.updatePage(page.id, { doc: { type: "doc", content: [{ type: "paragraph" }] } }));
  expect(renders).toEqual({ loaded: 1, notepads: 1, notepad: 1, otherPages: 1, pages: 2, page: 2, rev: 1 });
  const dirty = store.dirtyRecords(100);
  await act(() => store.markClean(dirty, dirty.map((r) => r.id)));
  expect(store.hasDirty()).toBe(false);
  expect(renders).toEqual({ loaded: 1, notepads: 1, notepad: 1, otherPages: 1, pages: 2, page: 2, rev: 1 });
  await act(() => store.updateNotepad(first, { title: "Renamed" }));
  expect(renders.notepads).toBe(2);
  expect(renders.notepad).toBe(2);
  expect(container.textContent).toContain("Renamed");
});

test("page lists stay current through create, delete, undo, remote updates and moving a page", async () => {
  const first = store.createNotepad();
  const second = store.createNotepad();
  const snapshots: Record<string, string[]> = {};
  function Pages({ id }: { id: string }) {
    snapshots[id] = store.usePages(id).map((p) => p.id);
    return null;
  }
  await act(() => root.render(<><Pages id={first} /><Pages id={second} /></>));
  let added = "";
  await act(() => { added = store.createPage(first); });
  expect(snapshots[first]).toContain(added);
  await act(() => store.deletePage(added));
  expect(snapshots[first]).not.toContain(added);
  await act(() => store.updatePage(added, { deleted: false, notepadId: second }));
  expect(snapshots[first]).not.toContain(added);
  expect(snapshots[second]).toContain(added);
  let undo = () => {};
  await act(() => { undo = store.deleteNotepad(second); });
  expect(snapshots[second]).toEqual([]);
  await act(undo);
  expect(snapshots[second]).toContain(added);
  const record = store.dirtyRecords(100).find((r) => r.id === added)!;
  await act(() => store.applyRemote([{ ...record, deleted: true, updatedAt: record.updatedAt + 1 }]));
  expect(snapshots[second]).not.toContain(added);
});
