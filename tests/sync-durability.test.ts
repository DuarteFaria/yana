import "fake-indexeddb/auto";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { WireRecord } from "../src/lib/store";

let store: typeof import("../src/lib/store");
let database: Awaited<ReturnType<typeof import("../src/lib/db")["db"]>>;
const record = (id: string, updatedAt = 100): WireRecord => ({
  id, kind: "page", updatedAt, deleted: false,
  data: JSON.stringify({ notepadId: "book", doc: null, overlay: [], order: 1, createdAt: 1 }),
});

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  store = await import("../src/lib/store");
  database = await (await import("../src/lib/db")).db();
});
afterEach(async () => {
  await store.flushWrites();
  database.close();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("records and cursor roll back together, then the same in-memory batch can retry", async () => {
  await store.applyRemote([record("a", 1)], 1);
  vi.spyOn(console, "error").mockImplementation(() => {});
  const put = IDBObjectStore.prototype.put;
  const fault = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, value, key) {
    const result = put.call(this, value, key);
    if (this.name === "pages" && value.id === "b") this.transaction.abort();
    return result;
  });
  const batch = [record("a"), record("b")];
  await expect(store.applyRemote(batch, 100)).rejects.toBeDefined();
  expect(await database.get("meta", "cursor")).toBe(1);
  expect((await database.get("pages", "a"))?.updatedAt).toBe(1);
  expect(await database.get("pages", "b")).toBeUndefined();
  fault.mockRestore();
  await store.applyRemote(batch, 100);
  expect(await database.get("meta", "cursor")).toBe(100);
  expect((await database.get("pages", "a"))?.updatedAt).toBe(100);
  expect((await database.get("pages", "b"))?.updatedAt).toBe(100);
});

test("a pull preserves newer local edits and cannot rewind the durable cursor", async () => {
  await store.applyRemote([record("a")], 100);
  store.updatePage("a", { doc: { type: "doc", content: [{ type: "paragraph" }] } });
  const local = store.getPage("a");
  await store.applyRemote([record("a", 1)], 1);
  expect(await database.get("pages", "a")).toEqual(local);
  expect(await database.get("meta", "cursor")).toBe(100);
});

test("edits queued after a pull remain newer on disk", async () => {
  const pull = store.applyRemote([record("a")], 100);
  store.updatePage("a", { order: 2 });
  await pull;
  await store.flushWrites();
  expect((await database.get("pages", "a"))?.order).toBe(2);
  expect(await database.get("meta", "cursor")).toBe(100);
});

test("malformed data cannot advance the cursor or partially replace memory", async () => {
  await expect(store.applyRemote([record("a"), { ...record("b"), data: "{" }], 100)).rejects.toBeDefined();
  expect(store.getPage("a")).toBeUndefined();
  expect(await database.get("meta", "cursor")).toBeUndefined();
});

test("edits made by a store subscriber cannot be overwritten by the pull", async () => {
  let edited = false;
  const unsubscribe = store.subscribe(() => {
    if (edited) return;
    edited = true;
    store.updatePage("a", { order: 3 });
  });
  await store.applyRemote([record("a")], 100);
  unsubscribe();
  await store.flushWrites();
  expect((await database.get("pages", "a"))?.order).toBe(3);
});
