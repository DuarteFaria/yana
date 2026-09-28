import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const EXIT_MS = 170;
const CloseContext = createContext<() => void>(() => {});

/** Close the surrounding modal with its exit animation. */
export function useModalClose() {
  return useContext(CloseContext);
}

export function Modal({
  title,
  onClose,
  children,
  wide,
  className,
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return createPortal(
    <div
      className={`modal-backdrop ${closing ? "closing" : ""}`}
      onPointerDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className={`modal ${wide ? "wide" : ""} ${className ?? ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && <h2 className="modal-title">{title}</h2>}
        <button className="modal-close" onClick={close} aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <CloseContext.Provider value={close}>{children}</CloseContext.Provider>
      </div>
    </div>,
    document.body,
  );
}
