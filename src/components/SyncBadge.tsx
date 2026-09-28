import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { syncConfigured } from "../Root";
import { useSyncStatus, type SyncStatus } from "../lib/sync";
import { Modal } from "./Modal";

const LABEL: Record<SyncStatus, string> = {
  local: "This device only",
  "signed-out": "Sign in to sync",
  offline: "Offline · saved here",
  syncing: "Syncing…",
  synced: "Synced",
  error: "Sync hiccup · retrying",
};

export function SyncBadge() {
  return syncConfigured ? <CloudBadge /> : <Badge status="local" />;
}

function Badge({ status, onClick }: { status: SyncStatus; onClick?: () => void }) {
  return (
    <button
      className={`sync-badge sync-${status}`}
      onClick={onClick}
      disabled={!onClick}
      title={status === "local" ? "Add VITE_CONVEX_URL to sync across devices" : undefined}
    >
      <span className="sync-dot" />
      {LABEL[status]}
    </button>
  );
}

function CloudBadge() {
  const status = useSyncStatus();
  const [open, setOpen] = useState(false);
  const { signOut } = useAuthActions();
  const shown = status === "local" ? "syncing" : status;
  return (
    <>
      <Badge status={shown} onClick={() => setOpen(true)} />
      {open && shown === "signed-out" && <SignIn onClose={() => setOpen(false)} />}
      {open && shown !== "signed-out" && (
        <Modal onClose={() => setOpen(false)} title="Sync">
          <p className="muted">
            Your notepads are saved on this device first and synced to your YANA cloud whenever
            you're online.
          </p>
          <div className="row end">
            <button
              className="btn"
              onClick={() => {
                signOut();
                setOpen(false);
              }}
            >
              Sign out
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function SignIn({ onClose }: { onClose: () => void }) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Modal onClose={onClose} title={flow === "signIn" ? "Welcome back" : "Claim your YANA"}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const fd = new FormData(e.currentTarget);
          try {
            await signIn("password", { email: String(fd.get("email")), password: String(fd.get("password")), flow });
            onClose();
          } catch (err) {
            const msg = String(err);
            setError(
              msg.includes("Sign-ups are closed")
                ? "This YANA already has an owner. Sign in instead."
                : flow === "signIn"
                  ? "That email and password didn't match."
                  : "Couldn't create the account (password needs 8+ characters).",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={flow === "signIn" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row between">
          <button type="button" className="link" onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}>
            {flow === "signIn" ? "First time? Create the account" : "Already set up? Sign in"}
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? "…" : flow === "signIn" ? "Sign in" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
