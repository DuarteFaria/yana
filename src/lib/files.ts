import { useEffect, useState } from "react";
import { db, type StoredFile } from "./db";
import { newId } from "./ids";

// Images live in IndexedDB as blobs and are referenced from documents by id.
// Sync uploads them to Convex storage; other devices fetch and cache them.

const urlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();
let remoteResolver: ((id: string) => Promise<string | null>) | null = null;
const resolverListeners = new Set<() => void>();
const pendingListeners = new Set<() => void>();

export function setRemoteFileResolver(fn: typeof remoteResolver) {
  remoteResolver = fn;
  resolverListeners.forEach((l) => l());
}

export function onPendingUpload(l: () => void) {
  pendingListeners.add(l);
  return () => pendingListeners.delete(l);
}

const MAX_SIDE = 2000;

/** Downscale huge photos; keep PNG/WebP/GIF so transparency survives. */
async function prepare(file: Blob): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const type = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
    return await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b ?? file), type, 0.88),
    );
  } catch {
    return file;
  }
}

export async function saveFile(file: Blob): Promise<string> {
  const blob = await prepare(file);
  const id = newId();
  const rec: StoredFile = { id, blob, mime: blob.type || "application/octet-stream", uploaded: 0 };
  await (await db()).put("files", rec);
  urlCache.set(id, URL.createObjectURL(blob));
  pendingListeners.forEach((l) => l());
  return id;
}

export async function pendingUploads(): Promise<StoredFile[]> {
  return (await db()).getAllFromIndex("files", "uploaded", 0);
}

export async function markUploaded(id: string) {
  const d = await db();
  const rec = await d.get("files", id);
  if (rec) await d.put("files", { ...rec, uploaded: 1 });
}

async function resolve(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const local = await (await db()).get("files", id);
  if (local) {
    const url = URL.createObjectURL(local.blob);
    urlCache.set(id, url);
    return url;
  }
  if (!remoteResolver) return null;
  const remote = await remoteResolver(id);
  if (!remote) return null;
  const blob = await (await fetch(remote)).blob();
  await (await db()).put("files", { id, blob, mime: blob.type, uploaded: 1 });
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function resolveFile(id: string) {
  let p = inflight.get(id);
  if (!p) {
    p = resolve(id).catch(() => null);
    inflight.set(id, p);
    p.then((url) => {
      // Allow a retry later (e.g. once signed in) if it wasn't found.
      if (!url) inflight.delete(id);
    });
  }
  return p;
}

export function useFileUrl(id: string | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(() => (id ? (urlCache.get(id) ?? null) : null));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const l = () => setAttempt((a) => a + 1);
    resolverListeners.add(l);
    return () => void resolverListeners.delete(l);
  }, []);

  useEffect(() => {
    if (!id) return setUrl(null);
    let alive = true;
    resolveFile(id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  return url;
}
