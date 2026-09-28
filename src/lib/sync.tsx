import { useConvex, useConvexAuth, useQuery } from "convex/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "../../convex/_generated/api";
import { getMeta } from "./db";
import { markUploaded, onPendingUpload, pendingUploads, setRemoteFileResolver } from "./files";
import { applyRemote, dirtyRecords, hasDirty, markClean, subscribe } from "./store";

export type SyncStatus = "local" | "signed-out" | "offline" | "syncing" | "synced" | "error";

let status: SyncStatus = "local";
const statusListeners = new Set<() => void>();
function setStatus(s: SyncStatus) {
  if (s === status) return;
  status = s;
  statusListeners.forEach((l) => l());
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
  );
}

const PUSH_BATCH = 25;
const PUSH_DELAY = 700;

/** Mount inside ConvexAuthProvider. Keeps the local store and Convex in sync. */
export function SyncEngine() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) setStatus("signed-out");
  }, [isAuthenticated, isLoading]);
  return isAuthenticated ? <Syncing /> : null;
}

function Syncing() {
  const convex = useConvex();
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    getMeta<number>("cursor").then((c) => setCursor(c ?? 0));
  }, []);

  // ---- pull: live query of everything after our cursor ----
  const pulled = useQuery(api.sync.pull, cursor === null ? "skip" : { since: cursor });
  useEffect(() => {
    if (!pulled || !pulled.records.length) return;
    const next = pulled.records.reduce((m, r) => Math.max(m, r.syncedAt), cursor ?? 0);
    let alive = true;
    let retry: number | undefined;
    const save = async () => {
      try {
        await applyRemote(pulled.records, next);
        if (alive) setCursor(next);
      } catch (error) {
        if (!alive) return;
        console.warn("YANA: failed to persist downloaded notes, will retry", error);
        setStatus("error");
        retry = window.setTimeout(save, 1000);
      }
    };
    void save();
    return () => {
      alive = false;
      window.clearTimeout(retry);
    };
  }, [pulled]);

  // ---- push: debounced, batched, retried with backoff ----
  const busy = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const backoff = useRef(1000);

  useEffect(() => {
    let alive = true;

    const pushOnce = async () => {
      if (busy.current || !alive) return;
      busy.current = true;
      try {
        if (!navigator.onLine) {
          setStatus("offline");
          return;
        }
        setStatus("syncing");
        for (let batch = dirtyRecords(PUSH_BATCH); batch.length; batch = dirtyRecords(PUSH_BATCH)) {
          const res = await convex.mutation(api.sync.push, { records: batch });
          markClean(batch, res.accepted);
          // Server kept a newer copy; adopting it also clears our dirty flag.
          if (res.newer.length) applyRemote(res.newer);
          if (!alive) return;
        }
        await uploadFiles();
        backoff.current = 1000;
        setStatus(hasDirty() ? "syncing" : "synced");
      } catch (e) {
        console.warn("YANA sync failed, will retry", e);
        setStatus(navigator.onLine ? "error" : "offline");
        timer.current = window.setTimeout(schedule, backoff.current);
        backoff.current = Math.min(backoff.current * 2, 60_000);
      } finally {
        busy.current = false;
      }
    };

    const uploadFiles = async () => {
      for (const f of await pendingUploads()) {
        const uploadUrl = await convex.mutation(api.files.generateUploadUrl, {});
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": f.mime },
          body: f.blob,
        });
        if (!res.ok) throw new Error(`upload failed: ${res.status}`);
        const { storageId } = await res.json();
        await convex.mutation(api.files.register, { id: f.id, storageId, mime: f.mime });
        await markUploaded(f.id);
      }
    };

    const schedule = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(pushOnce, PUSH_DELAY);
    };

    const unsubStore = subscribe(() => hasDirty() && schedule());
    const unsubFiles = onPendingUpload(schedule);
    window.addEventListener("online", schedule);
    const offline = () => setStatus("offline");
    window.addEventListener("offline", offline);
    // Push immediately when the app is being hidden (switching apps on iOS).
    const hide = () => document.visibilityState === "hidden" && pushOnce();
    document.addEventListener("visibilitychange", hide);
    pushOnce();

    return () => {
      alive = false;
      window.clearTimeout(timer.current);
      unsubStore();
      unsubFiles();
      window.removeEventListener("online", schedule);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [convex]);

  useEffect(() => {
    setRemoteFileResolver((id) => convex.query(api.files.url, { id }));
    return () => setRemoteFileResolver(null);
  }, [convex]);

  return null;
}
