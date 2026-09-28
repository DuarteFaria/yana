import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { App } from "./App";
import { SyncEngine } from "./lib/sync";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export const syncConfigured = !!convex;

export function Root() {
  if (!convex) return <App />;
  return (
    <ConvexAuthProvider client={convex}>
      <SyncEngine />
      <App />
    </ConvexAuthProvider>
  );
}
