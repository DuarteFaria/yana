import type { CSSProperties } from "react";
import { useClock } from "../lib/daypart";

/**
 * The wall behind every screen: colours follow the real time of day, soft
 * light drifts across it, and dust (or, at night, a few fireflies) floats by.
 * Fixed and non-interactive, so it never adds scrolling.
 */
export function Ambient() {
  useClock(60_000);
  return (
    <div className="ambient" aria-hidden>
      <div className="amb-glow a" />
      <div className="amb-glow b" />
      <div className="amb-glow c" />
      <div className="amb-beam" />
      <div className="amb-paper" />
      <div className="amb-motes">
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            style={
              {
                "--x": `${(i * 53) % 100}%`,
                "--y": `${(i * 37) % 92}%`,
                "--t": `${10 + (i % 5) * 3}s`,
                "--delay": `${-i * 1.7}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
