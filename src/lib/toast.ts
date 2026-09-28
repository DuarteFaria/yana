import { useSyncExternalStore } from "react";

export type Toast = { id: number; message: string; action?: { label: string; run: () => void } };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(t: Omit<Toast, "id">, ms = 5000) {
  const toast = { ...t, id: nextId++ };
  toasts = [...toasts, toast];
  emit();
  window.setTimeout(() => dismissToast(toast.id), ms);
  return toast.id;
}

export function dismissToast(id: number) {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
  );
}
