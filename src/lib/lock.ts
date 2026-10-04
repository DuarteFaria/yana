import { useSyncExternalStore } from "react";
import { onRouteChange } from "./route";
import type { NotepadLock } from "./types";

// A privacy lock, not encryption: the notepad's pages are stored and synced
// as usual, the app just won't show them until the password is given.

const ITERATIONS = 210_000;

function toB64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromB64(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.normalize("NFC")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return toB64(new Uint8Array(bits));
}

export async function makeLock(password: string, hint?: string): Promise<NotepadLock> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const lock: NotepadLock = { salt: toB64(salt), hash: await derive(password, salt, ITERATIONS), iterations: ITERATIONS };
  if (hint?.trim()) lock.hint = hint.trim();
  return lock;
}

export async function checkPassword(lock: NotepadLock, password: string) {
  return (await derive(password, fromB64(lock.salt), lock.iterations)) === lock.hash;
}

// ---------- which notepads are open right now ----------

// Unlocking lasts while you're inside the notepad; leaving locks it again.
const unlocked = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

onRouteChange((r) => {
  let changed = false;
  for (const id of unlocked) {
    if (r.view === "book" && r.id === id) continue;
    unlocked.delete(id);
    changed = true;
  }
  if (changed) emit();
});

export function markUnlocked(id: string) {
  unlocked.add(id);
  emit();
}

export function relock(id: string) {
  if (unlocked.delete(id)) emit();
}

export function useUnlocked(id: string) {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => unlocked.has(id),
  );
}
