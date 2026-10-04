import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type Ref } from "react";
import { checkPassword, makeLock, markUnlocked, relock } from "../lib/lock";
import { go, withTransition } from "../lib/route";
import { updateNotepad } from "../lib/store";
import { showToast } from "../lib/toast";
import type { Cover as CoverT, Notepad } from "../lib/types";
import { Cover } from "./Cover";
import { Modal, useModalClose } from "./Modal";
import { SyncBadge } from "./SyncBadge";

// ---------- the diary strap + heart padlock drawn over a cover ----------

/** Same 220×300 box as <Cover>, so it lines up at any size. */
export function CoverLock({ ribbon, width, open }: { ribbon: string; width: number; open?: boolean }) {
  return (
    <svg className={`cover-lock ${open ? "open" : ""}`} viewBox="0 0 220 300" width={width} height={(width * 300) / 220} aria-hidden style={{ overflow: "visible" }}>
      {/* strap wrapping round from the back */}
      <rect x="136" y="164" width="80" height="36" rx="11" fill={ribbon} />
      <rect x="200" y="164" width="16" height="36" rx="7" fill="#000" opacity="0.14" />
      <rect x="141" y="169" width="70" height="26" rx="8" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="5 4" />
      <g transform="translate(162 182) scale(1.65) translate(-168 -182)">
      <g className="cl-padlock">
        <path className="cl-shackle" d="M161 172 V161 a7 7 0 0 1 14 0 V172" fill="none" stroke="#c9922e" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M168 200 C150 188 147 170 158 168 C163 167 166 170 168 174 C170 170 173 167 178 168 C189 170 186 188 168 200 Z" fill="#f7c95c" stroke="#c9922e" strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="160" cy="175" rx="3" ry="2" fill="#fff" opacity="0.75" transform="rotate(-30 160 175)" />
        <circle cx="168" cy="181" r="2.8" fill="#7a5520" />
        <path d="M166.6 182 h2.8 l0.8 6 h-4.4 z" fill="#7a5520" />
      </g>
      </g>
    </svg>
  );
}

export function LockedCover({ cover, width, locked, open, title }: { cover: CoverT; width: number; locked: boolean; open?: boolean; title?: string }) {
  return (
    <span className="locked-cover">
      <Cover cover={cover} width={width} title={title} />
      {locked && <CoverLock ribbon={cover.ribbon} width={width} open={open} />}
    </span>
  );
}

export function PadlockIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path d="M8.5 10 V7 a3.5 3.5 0 0 1 7 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" transform={filled ? undefined : "rotate(-18 15.5 10)"} />
      <path
        d="M12 21 C5.5 17 4.5 11 8 10.2 C9.8 9.8 11.2 10.8 12 12.2 C12.8 10.8 14.2 9.8 16 10.2 C19.5 11 18.5 17 12 21 Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------- password field that types little hearts ----------

export function HeartInput({
  value,
  onChange,
  label,
  placeholder,
  autoFocus,
  autoComplete = "current-password",
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const [peek, setPeek] = useState(false);
  return (
    <div className={`heart-input ${peek ? "peek" : ""}`}>
      <input
        ref={inputRef}
        type={peek ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        autoCapitalize="off"
        spellCheck={false}
      />
      {!peek && (
        <span className="heart-dots" aria-hidden>
          {Array.from(value)
            .slice(-14)
            .map((_, i) => (
              <span key={i}>♥</span>
            ))}
        </span>
      )}
      <button
        type="button"
        className="peek-btn"
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => setPeek((p) => !p)}
        aria-label={peek ? "Hide password" : "Show password"}
        title={peek ? "Hide password" : "Peek"}
      >
        {peek ? "🐵" : "🙈"}
      </button>
    </div>
  );
}

// ---------- unlocking ----------

const NOPES = ["hmm, that’s not it", "nope! the lock is being stubborn", "still not it… deep breath ✿", "the lock shakes its little head"];
const WOBBLE: Keyframe[] = [{ rotate: "0deg" }, { rotate: "-7deg" }, { rotate: "6deg" }, { rotate: "-4deg" }, { rotate: "2deg" }, { rotate: "0deg" }];
const SHAKE: Keyframe[] = [{ translate: "0" }, { translate: "-10px" }, { translate: "9px" }, { translate: "-6px" }, { translate: "3px" }, { translate: "0" }];
const OPEN_MS = 750;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function UnlockForm({
  notepad,
  coverWidth,
  sub,
  action,
  onUnlocked,
  stageStyle,
}: {
  notepad: Notepad;
  coverWidth: number;
  sub: string;
  action: string;
  onUnlocked: () => void;
  stageStyle?: CSSProperties;
}) {
  const lock = notepad.lock!;
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [tries, setTries] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pw || busy || open) return;
    setBusy(true);
    const ok = await checkPassword(lock, pw);
    setBusy(false);
    if (ok) {
      setOpen(true);
      timer.current = window.setTimeout(onUnlocked, reducedMotion() ? 0 : OPEN_MS);
      return;
    }
    setTries((t) => t + 1);
    setPw("");
    stage.current?.animate(WOBBLE, { duration: 520, easing: "ease-out" });
    field.current?.animate(SHAKE, { duration: 420, easing: "ease-out" });
    input.current?.focus();
  };

  return (
    <form className={`unlock ${open ? "open" : ""}`} onSubmit={submit}>
      <div className="lock-stage" ref={stage} style={stageStyle}>
        <LockedCover cover={notepad.cover} width={coverWidth} locked open={open} title={notepad.title} />
        {open && (
          <span className="lock-burst" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} style={{ "--k": i } as CSSProperties}>♥</i>
            ))}
          </span>
        )}
      </div>
      <h2 className="lock-title">{notepad.title || "Untitled"}</h2>
      <p className="lock-sub">{open ? "click! welcome back ✿" : sub}</p>
      <div className="unlock-row" ref={field}>
        <HeartInput value={pw} onChange={setPw} label="Password" placeholder="password" autoFocus inputRef={input} />
        <button className="btn primary" disabled={!pw || busy || open}>
          {busy ? "…" : action}
        </button>
      </div>
      <p className="lock-nope" key={tries} aria-live="polite">
        {tries > 0 && !open && NOPES[(tries - 1) % NOPES.length]}
      </p>
      {tries > 0 && lock.hint && !open && (
        <p className="lock-hint">
          <span>psst, your hint:</span> {lock.hint}
        </p>
      )}
    </form>
  );
}

/** Stands in for the notepad's pages until the password is given. */
export function LockScreen({ notepad }: { notepad: Notepad }) {
  return (
    <div className="book-main lock-screen">
      <header className="book-header" data-tauri-drag-region>
        <button className="icon-btn only-compact" onClick={() => go({ view: "shelf" })} aria-label="Bookstand">
          ‹
        </button>
        <span className="grow" />
        <SyncBadge />
      </header>
      <div className="lock-center">
        <UnlockForm
          key={notepad.id}
          notepad={notepad}
          coverWidth={180}
          sub="this notepad is locked — whisper the password"
          action="Unlock"
          // The cover grows into the first page as it opens.
          stageStyle={{ viewTransitionName: `book-${notepad.id}` } as CSSProperties}
          onUnlocked={() => void withTransition(() => markUnlocked(notepad.id))}
        />
      </div>
    </div>
  );
}

/** Asks for the password before doing something to a locked notepad. */
export function UnlockDialog({ notepad, sub, action, onUnlocked, onClose }: { notepad: Notepad; sub: string; action: string; onUnlocked: () => void; onClose: () => void }) {
  return (
    <Modal onClose={onClose} className="lock-modal">
      <UnlockForm notepad={notepad} coverWidth={120} sub={sub} action={action} onUnlocked={onUnlocked} />
    </Modal>
  );
}

// ---------- setting / changing / removing the lock ----------

export function LockSettings({ notepad, onClose }: { notepad: Notepad; onClose: () => void }) {
  return (
    <Modal onClose={onClose} className="lock-modal">
      <LockSettingsBody notepad={notepad} />
    </Modal>
  );
}

function LockSettingsBody({ notepad }: { notepad: Notepad }) {
  const close = useModalClose();
  const [changing, setChanging] = useState(!notepad.lock);
  const title = notepad.title || "Untitled";

  if (changing || !notepad.lock) {
    return <SetPassword notepad={notepad} onDone={close} onCancel={notepad.lock ? () => setChanging(false) : close} />;
  }

  const remove = () => {
    const prev = notepad.lock;
    updateNotepad(notepad.id, { lock: undefined });
    showToast({
      message: `“${title}” is an open book now`,
      action: { label: "Undo", run: () => updateNotepad(notepad.id, { lock: prev }) },
    });
    close();
  };

  return (
    <div className="lock-settings">
      <div className="lock-stage">
        <LockedCover cover={notepad.cover} width={110} locked open />
      </div>
      <h2 className="lock-title">Locked with a heart</h2>
      <p className="lock-sub">“{title}” locks itself again whenever you leave it.</p>
      <button className="btn primary" onClick={() => void withTransition(() => relock(notepad.id))}>
        Lock it now
      </button>
      <div className="lock-links">
        <button className="link" onClick={() => setChanging(true)}>
          change password
        </button>
        <span className="muted">·</span>
        <button className="link danger" onClick={remove}>
          remove lock
        </button>
      </div>
    </div>
  );
}

function SetPassword({ notepad, onDone, onCancel }: { notepad: Notepad; onDone: () => void; onCancel: () => void }) {
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [hint, setHint] = useState(notepad.lock?.hint ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const matches = pw.length > 0 && pw === again;
  const changing = !!notepad.lock;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!pw) return setError("pick a password first");
    if (pw !== again) return setError("those don’t match — try once more");
    if (hint.toLowerCase().includes(pw.toLowerCase())) return setError("shh! the hint gives the password away");
    setBusy(true);
    const lock = await makeLock(pw, hint);
    // Whoever sets the lock stays inside until they leave.
    markUnlocked(notepad.id);
    updateNotepad(notepad.id, { lock });
    showToast({ message: changing ? "New password saved ✿" : `“${notepad.title || "Untitled"}” is locked — it locks again when you leave` });
    onDone();
  };

  return (
    <form className="lock-settings" onSubmit={submit}>
      <div className="lock-stage">
        <LockedCover cover={notepad.cover} width={110} locked open={!matches} />
      </div>
      <h2 className="lock-title">{changing ? "A new password" : "Lock this notepad"}</h2>
      <p className="lock-sub">Only someone with the password can peek inside. There’s no reset, so pick one you’ll remember.</p>
      <div className="lock-fields">
        <HeartInput value={pw} onChange={(v) => (setPw(v), setError(null))} label="Password" placeholder="password" autoFocus autoComplete="new-password" />
        <HeartInput value={again} onChange={(v) => (setAgain(v), setError(null))} label="Password again" placeholder="once more" autoComplete="new-password" />
        <input className="hint-field" value={hint} onChange={(e) => (setHint(e.target.value), setError(null))} placeholder="a little hint for future you (optional)" aria-label="Hint" maxLength={80} />
      </div>
      <p className={`lock-nope ${matches ? "ok" : ""}`} aria-live="polite">
        {error ?? (matches ? "they match ♥" : "")}
      </p>
      <div className="lock-links">
        <button type="button" className="btn ghost" onClick={onCancel}>
          {changing ? "Back" : "Not now"}
        </button>
        <button className="btn primary" disabled={busy}>
          {changing ? "Save password" : "Lock it"}
        </button>
      </div>
    </form>
  );
}
