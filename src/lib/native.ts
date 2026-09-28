import { useEffect, useState } from "react";

export const inTauri = "__TAURI_INTERNALS__" in window;

if (inTauri) document.documentElement.classList.add("tauri");

type UpdateState = { version: string; restart: () => void } | null;

/** In the Mac app: quietly download a new version, then offer a restart. */
export function useAppUpdate(): UpdateState {
  const [state, setState] = useState<UpdateState>(null);
  useEffect(() => {
    if (!inTauri || import.meta.env.DEV) return;
    const t = window.setTimeout(async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (!update) return;
        await update.downloadAndInstall();
        const { relaunch } = await import("@tauri-apps/plugin-process");
        setState({ version: update.version, restart: () => relaunch() });
      } catch (e) {
        console.warn("YANA: update check failed", e);
      }
    }, 4000);
    return () => window.clearTimeout(t);
  }, []);
  return state;
}
