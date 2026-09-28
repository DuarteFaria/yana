import "@fontsource/gluten/500.css";
import "@fontsource/gluten/700.css";
import "@fontsource-variable/nunito";
import "@fontsource/patrick-hand";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/jetbrains-mono";
import "katex/dist/katex.min.css";
import "./styles/app.css";
import "./styles/editor.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Root } from "./Root";
import { requestPersistence } from "./lib/db";
import { inTauri } from "./lib/native";
import { loadStore } from "./lib/store";

requestPersistence();

// First-load entrance animations; later screens animate via view transitions.
document.documentElement.classList.add("intro");
window.setTimeout(() => document.documentElement.classList.remove("intro"), 2500);
loadStore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

if (import.meta.env.PROD && !inTauri && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
