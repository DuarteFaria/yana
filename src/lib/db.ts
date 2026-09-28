import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Notepad, Page, Stored } from "./types";

export type StoredFile = {
  id: string;
  blob: Blob;
  mime: string;
  /** 1 once the blob exists in Convex storage. */
  uploaded: 0 | 1;
};

interface YanaDB extends DBSchema {
  notepads: { key: string; value: Stored<Notepad> };
  pages: { key: string; value: Stored<Page>; indexes: { notepadId: string } };
  files: { key: string; value: StoredFile; indexes: { uploaded: number } };
  meta: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<YanaDB>> | null = null;

export function db() {
  dbPromise ??= openDB<YanaDB>("yana", 1, {
    upgrade(d) {
      d.createObjectStore("notepads", { keyPath: "id" });
      d.createObjectStore("pages", { keyPath: "id" }).createIndex(
        "notepadId",
        "notepadId",
      );
      d.createObjectStore("files", { keyPath: "id" }).createIndex(
        "uploaded",
        "uploaded",
      );
      d.createObjectStore("meta");
    },
  });
  return dbPromise;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get("meta", key)) as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  await (await db()).put("meta", value, key);
}

// Ask the browser not to evict our data under storage pressure (Safari
// otherwise may clear IndexedDB for sites not visited in a while).
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}
