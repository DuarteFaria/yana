import type { CSSProperties } from "react";
import { useClock } from "../lib/daypart";

/** A big window showing the real sky (sized by its container). */
export function Window() {
  const { part } = useClock(60_000);
  return (
    <div className={`window sky-${part}`} aria-hidden>
      <div className="window-sky">
        <span className="sun" />
        <span className="moon" />
        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className="star"
            style={
              {
                "--sx": `${(i * 29 + 7) % 96}%`,
                "--sy": `${(i * 17 + 5) % 55}%`,
                "--sd": `${(i * 0.37) % 2.4}s`,
              } as CSSProperties
            }
          />
        ))}
        <span className="cloud c1" />
        <span className="cloud c2" />
        <span className="cloud c3" />
        <span className="hills back" />
        <span className="hills" />
        <span className="window-glare" />
      </div>
      <span className="window-cross" />
      <span className="curtain l" />
      <span className="curtain r" />
      <span className="curtain-rod" />
      <span className="sill" />
    </div>
  );
}

export function Clock() {
  const { now } = useClock(1000);
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();
  return (
    <div className="wall-clock" aria-hidden>
      <svg viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="#fffaf0"
          stroke="#b27a4a"
          strokeWidth="5"
        />
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="#e9dcc6"
          strokeWidth="1"
        />
        {Array.from({ length: 60 }, (_, i) => (
          <line
            key={i}
            x1="50"
            y1={i % 5 ? 11 : 10}
            x2="50"
            y2={i % 5 ? 13 : 15}
            stroke={i % 15 ? "#c9b8a6" : "#e0647d"}
            strokeWidth={i % 5 ? 0.6 : 1.6}
            strokeLinecap="round"
            transform={`rotate(${i * 6} 50 50)`}
          />
        ))}
        {[12, 3, 6, 9].map((n, i) => (
          <text
            key={n}
            x={50 + 29 * Math.sin((i * Math.PI) / 2)}
            y={50 - 29 * Math.cos((i * Math.PI) / 2) + 4}
            textAnchor="middle"
            fontFamily="Gluten"
            fontWeight="700"
            fontSize="11"
            fill="#3b2f2f"
          >
            {n}
          </text>
        ))}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="30"
          stroke="#3b2f2f"
          strokeWidth="3.6"
          strokeLinecap="round"
          transform={`rotate(${h * 30 + m * 0.5} 50 50)`}
        />
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="20"
          stroke="#3b2f2f"
          strokeWidth="2.4"
          strokeLinecap="round"
          transform={`rotate(${m * 6 + s * 0.1} 50 50)`}
        />
        <line
          x1="50"
          y1="56"
          x2="50"
          y2="17"
          stroke="#e0647d"
          strokeWidth="1.1"
          strokeLinecap="round"
          transform={`rotate(${s * 6} 50 50)`}
        />
        <circle cx="50" cy="50" r="3" fill="#e0647d" />
      </svg>
    </div>
  );
}
