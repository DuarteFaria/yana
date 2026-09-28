import type { CSSProperties, ReactNode } from "react";

/** Pill toggle whose highlight slides between options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { key: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  return (
    <div
      className={`seg ${className ?? ""}`}
      role="tablist"
      style={{ "--n": options.length, "--i": index } as CSSProperties}
    >
      <span className="seg-thumb" aria-hidden />
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={o.key === value}
          className={o.key === value ? "on" : ""}
          title={o.title}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
